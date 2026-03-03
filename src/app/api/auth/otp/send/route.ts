import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { otpSendSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { hashOtpCode } from "@/lib/crypto";
import { sendSupabaseAuthOtp } from "@/lib/auth-flows";
import { readClientIp } from "@/lib/ip-ban";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, otpSendSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `otp:send:${ip}`,
    limit: 20,
    windowMs: 60_000
  });

  if (!limiter.allowed) {
    return fail("Ban gui OTP qua nhanh", 429);
  }

  const admin = createSupabaseAdmin();
  if (parsed.data.purpose === "register") {
    const { data: profileByEmail } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", parsed.data.email)
      .maybeSingle();
    if (profileByEmail) {
      return fail("Email da ton tai", 409);
    }
  }

  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

  const hourlyCountResult = await admin
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", parsed.data.email)
    .eq("purpose", parsed.data.purpose)
    .gte("created_at", hourAgo);

  if ((hourlyCountResult.count ?? 0) >= 2) {
    return fail("Da vuot qua gioi han 2 lan gui OTP trong 1 gio", 429);
  }

  const sendResult = await sendSupabaseAuthOtp({
    email: parsed.data.email,
    purpose: parsed.data.purpose
  });
  if (!sendResult.ok) {
    return fail("Khong gui duoc OTP qua email", 500, sendResult.message);
  }

  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const marker = hashOtpCode(randomUUID());
  const { data, error } = await admin
    .from("otp_requests")
    .insert({
      email: parsed.data.email,
      purpose: parsed.data.purpose,
      code_hash: marker,
      expires_at: expiresAt,
      ip_address: ip,
      attempt_count: 0
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail("Khong luu duoc OTP request", 500, error?.message);
  }

  return ok({
    otpRequestId: data.id,
    expiresInSeconds: 3600
  });
}
