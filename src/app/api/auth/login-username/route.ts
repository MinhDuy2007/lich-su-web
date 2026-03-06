import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { loginSchema } from "@/lib/validation";
import { verifyCaptchaSession } from "@/lib/auth-flows";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { isIpBanned, readClientIp } from "@/lib/ip-ban";
import { trackUserIp } from "@/lib/user-ip-log";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";

  if (await isIpBanned(ip)) {
    return fail("IP của bạn đã bị chặn", 403);
  }

  const limiter = checkRateLimit({
    key: `auth:login:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Bạn đang thử đăng nhập quá nhanh", 429);
  }

  const parsed = await parseBody(request, loginSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const captchaCheck = await verifyCaptchaSession({
    sessionId: parsed.data.captchaSessionId,
    answer: parsed.data.captchaAnswer
  });
  if (!captchaCheck.ok) {
    return fail(captchaCheck.message, 400);
  }

  const admin = createSupabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id, email, is_banned")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (profileError || !profile) {
    return fail("Thông tin đăng nhập không đúng", 401);
  }
  if (profile.is_banned) {
    return fail("Tài khoản đã bị khóa", 403);
  }

  const supabase = await createSupabaseRouteClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.password
  });
  if (signInResult.error || !signInResult.data.user) {
    return fail("Thông tin đăng nhập không đúng", 401);
  }

  try {
    await trackUserIp(signInResult.data.user.id, ip, request.headers.get("user-agent"));
  } catch {
    // Ignore ip logging errors on login flow.
  }

  return ok({
    user: signInResult.data.user
  });
}
