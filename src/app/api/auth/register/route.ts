import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { registerSchema } from "@/lib/validation";
import { findAuthUserByEmail, verifyCaptchaSession, verifyOtpSession } from "@/lib/auth-flows";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { readClientIp } from "@/lib/ip-ban";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `auth:register:${ip}`,
    limit: 15,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Too many requests", 429);
  }

  const parsed = await parseBody(request, registerSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const captchaCheck = await verifyCaptchaSession({
    sessionId: parsed.data.captchaSessionId,
    answer: parsed.data.captchaAnswer
  });
  if (!captchaCheck.ok) {
    return fail(captchaCheck.message, 400);
  }

  const otpCheck = await verifyOtpSession({
    otpRequestId: parsed.data.otpRequestId,
    otpCode: parsed.data.otpCode,
    email: parsed.data.email,
    purpose: "register"
  });
  if (!otpCheck.ok) {
    return fail(otpCheck.message, 400);
  }

  const admin = createSupabaseAdmin();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (existingProfile) {
    return fail("Username da ton tai", 409);
  }

  const verifiedUser =
    otpCheck.user ?? (await findAuthUserByEmail(parsed.data.email));
  if (!verifiedUser) {
    return fail("Khong tim thay tai khoan Auth sau khi xac thuc OTP", 404);
  }

  const { data: emailProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (emailProfile && emailProfile.user_id !== verifiedUser.id) {
    return fail("Email da ton tai", 409);
  }

  const updateResult = await admin.auth.admin.updateUserById(verifiedUser.id, {
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      ...(verifiedUser.user_metadata ?? {}),
      username: parsed.data.username
    }
  });
  if (updateResult.error) {
    return fail(
      "Khong cap nhat duoc thong tin tai khoan",
      500,
      updateResult.error.message
    );
  }

  const userId = verifiedUser.id;
  const [profileResult, userRoleCheck] = await Promise.all([
    admin.from("profiles").upsert(
      {
      user_id: userId,
      username: parsed.data.username,
      email: parsed.data.email,
      is_banned: false
      },
      {
        onConflict: "user_id"
      }
    ),
    admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "user")
      .limit(1)
  ]);

  if (profileResult.error || userRoleCheck.error) {
    return fail(
      "Tao profile hoac role that bai",
      500,
      profileResult.error?.message ?? userRoleCheck.error?.message ?? null
    );
  }

  if ((userRoleCheck.data?.length ?? 0) === 0) {
    const roleResult = await admin.from("user_roles").insert({
      user_id: userId,
      role: "user",
      granted_by: userId
    });

    if (roleResult.error) {
      return fail("Khong tao duoc role mac dinh", 500, roleResult.error.message);
    }
  }

  return ok(
    {
      userId,
      username: parsed.data.username
    },
    201
  );
}
