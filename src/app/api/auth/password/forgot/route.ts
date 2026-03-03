import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { forgotPasswordSchema } from "@/lib/validation";
import { sendSupabaseAuthOtp, verifyCaptchaSession } from "@/lib/auth-flows";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashOtpCode } from "@/lib/crypto";
import { readClientIp } from "@/lib/ip-ban";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `auth:forgot:${ip}`,
    limit: 15,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Qua nhieu yeu cau", 429);
  }

  const parsed = await parseBody(request, forgotPasswordSchema);
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

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, email")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (!profile) {
    return fail("Email khong ton tai", 404);
  }

  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const hourlyCountResult = await admin
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", parsed.data.email)
    .eq("purpose", "forgot_password")
    .gte("created_at", hourAgo);
  if ((hourlyCountResult.count ?? 0) >= 2) {
    return fail("Da vuot qua gioi han 2 lan gui OTP trong 1 gio", 429);
  }

  const sendResult = await sendSupabaseAuthOtp({
    email: parsed.data.email,
    purpose: "forgot_password"
  });
  if (!sendResult.ok) {
    return fail("Khong gui duoc OTP qua email", 500, sendResult.message);
  }

  const marker = hashOtpCode(randomUUID());
  const { data, error } = await admin
    .from("otp_requests")
    .insert({
      email: parsed.data.email,
      purpose: "forgot_password",
      code_hash: marker,
      expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      ip_address: ip,
      attempt_count: 0
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail("Khong tao duoc OTP", 500, error?.message);
  }

  return ok({
    otpRequestId: data.id,
    expiresInSeconds: 3600
  });
}
