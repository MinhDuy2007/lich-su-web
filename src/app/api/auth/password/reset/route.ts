import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { resetPasswordSchema } from "@/lib/validation";
import { findAuthUserByEmail, verifyOtpSession } from "@/lib/auth-flows";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `auth:reset:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Quá nhiều yêu cầu", 429);
  }

  const parsed = await parseBody(request, resetPasswordSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const otpCheck = await verifyOtpSession({
    otpRequestId: parsed.data.otpRequestId,
    otpCode: parsed.data.otpCode,
    email: parsed.data.email,
    purpose: "forgot_password"
  });
  if (!otpCheck.ok) {
    return fail(otpCheck.message, 400);
  }

  const admin = createSupabaseAdmin();
  const otpUser = otpCheck.user ?? (await findAuthUserByEmail(parsed.data.email));
  if (!otpUser) {
    return fail("Tài khoản không tồn tại", 404);
  }

  const updateResult = await admin.auth.admin.updateUserById(otpUser.id, {
    password: parsed.data.newPassword
  });
  if (updateResult.error) {
    return fail("Đặt lại mật khẩu thất bại", 500, updateResult.error.message);
  }

  return ok({ updated: true });
}
