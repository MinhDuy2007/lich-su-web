import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { registerSchema } from "@/lib/validation";
import {
  findAuthUserByEmail,
  verifyCaptchaSession,
  verifyOtpSession
} from "@/lib/auth-flows";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isIpBanned, readClientIp } from "@/lib/ip-ban";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  EMAIL_TAKEN_MESSAGE,
  USERNAME_TAKEN_MESSAGE,
  normalizeEmail,
  normalizeUsername
} from "@/lib/register-availability";
import { trackUserIp } from "@/lib/user-ip-log";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  if (await isIpBanned(ip)) {
    return fail("Địa chỉ IP của bạn đã bị chặn", 403);
  }

  const limiter = checkRateLimit({
    key: `auth:register:${ip}`,
    limit: 15,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Quá nhiều yêu cầu", 429);
  }

  const parsed = await parseBody(request, registerSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  const normalizedEmail = normalizeEmail(parsed.data.email);

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
    email: normalizedEmail,
    purpose: "register"
  });
  if (!otpCheck.ok) {
    return fail(otpCheck.message, 400);
  }

  const admin = createSupabaseAdmin();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", normalizedUsername)
    .maybeSingle();
  if (existingProfile) {
    return fail(USERNAME_TAKEN_MESSAGE, 409);
  }

  const verifiedUser = otpCheck.user ?? (await findAuthUserByEmail(normalizedEmail));
  if (!verifiedUser) {
    return fail("Không tìm thấy tài khoản Auth sau khi xác thực OTP", 404);
  }

  const { data: emailProfile } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (emailProfile && emailProfile.user_id !== verifiedUser.id) {
    return fail(EMAIL_TAKEN_MESSAGE, 409);
  }

  const updateResult = await admin.auth.admin.updateUserById(verifiedUser.id, {
    password: parsed.data.password,
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      ...(verifiedUser.user_metadata ?? {}),
      username: normalizedUsername
    }
  });
  if (updateResult.error) {
    return fail(
      "Không cập nhật được thông tin tài khoản",
      500,
      updateResult.error.message
    );
  }

  const userId = verifiedUser.id;
  const [profileResult, userRoleCheck] = await Promise.all([
    admin.from("profiles").upsert(
      {
        user_id: userId,
        username: normalizedUsername,
        email: normalizedEmail,
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
      "Tạo hồ sơ hoặc vai trò thất bại",
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
      return fail("Không tạo được vai trò mặc định", 500, roleResult.error.message);
    }
  }

  try {
    await trackUserIp(userId, ip, request.headers.get("user-agent"));
  } catch {
    // Do not fail registration if ip logging is unavailable.
  }

  return ok(
    {
      userId,
      username: normalizedUsername
    },
    201
  );
}
