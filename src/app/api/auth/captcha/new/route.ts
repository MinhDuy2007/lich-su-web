import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildCaptchaSvg, generateCaptchaText } from "@/lib/captcha";
import { hashOtpCode } from "@/lib/crypto";
import { ok, fail } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";

export async function GET(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `captcha:new:${ip}`,
    limit: 60,
    windowMs: 60_000
  });

  if (!limiter.allowed) {
    return fail("Quá nhiều yêu cầu captcha", 429);
  }

  const admin = createSupabaseAdmin();
  const text = generateCaptchaText(6);
  const answerHash = hashOtpCode(text.toUpperCase());
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const ipAddress = readClientIp(request);

  const { data, error } = await admin
    .from("captcha_sessions")
    .insert({
      answer_hash: answerHash,
      expires_at: expiresAt,
      ip_address: ipAddress
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail("Không tạo được captcha", 500, error?.message);
  }

  return ok({
    sessionId: data.id,
    svg: buildCaptchaSvg(text)
  });
}

