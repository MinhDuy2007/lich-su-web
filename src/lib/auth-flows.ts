import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { hashOtpCode } from "@/lib/crypto";
import { getEnv } from "@/lib/env";

function mapSupabaseOtpError(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("email rate limit exceeded")) {
    return "Supabase Auth dang gioi han toc do gui email. Thu lai sau.";
  }
  if (message.includes("security purpose")) {
    return "Yeu cau gui OTP tam thoi bi chan vi ly do bao mat. Thu lai sau.";
  }
  if (message.includes("forbidden")) {
    return "Supabase Auth Email chua duoc cau hinh day du tren dashboard.";
  }

  return `Supabase Auth Email loi: ${rawMessage}`;
}

function resolveAuthRedirectUrl() {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_APP_URL) {
    return undefined;
  }

  return `${env.NEXT_PUBLIC_APP_URL}/auth/dang-nhap`;
}

export async function sendSupabaseAuthOtp(payload: {
  email: string;
  purpose: "register" | "forgot_password";
}) {
  const anon = createSupabaseAnonClient();
  const redirectTo = resolveAuthRedirectUrl();

  const { error } = await anon.auth.signInWithOtp({
    email: payload.email,
    options: {
      shouldCreateUser: payload.purpose === "register",
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {})
    }
  });

  if (!error) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    message: mapSupabaseOtpError(error.message)
  };
}

export async function findAuthUserByEmail(email: string) {
  const admin = createSupabaseAdmin();
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const result = await admin.auth.admin.listUsers({
      page,
      perPage
    });

    if (result.error) {
      return null;
    }

    const found = result.data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) {
      return found;
    }

    if (result.data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function verifyCaptchaSession(payload: {
  sessionId: string;
  answer: string;
}) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("captcha_sessions")
    .select("id, answer_hash, expires_at, used_at")
    .eq("id", payload.sessionId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Captcha khong ton tai" };
  }
  if (data.used_at) {
    return { ok: false, message: "Captcha da duoc su dung" };
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "Captcha da het han" };
  }

  if (hashOtpCode(payload.answer.trim().toUpperCase()) !== data.answer_hash) {
    return { ok: false, message: "Captcha khong dung" };
  }

  await admin
    .from("captcha_sessions")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { ok: true, message: "OK" };
}

export async function verifyOtpSession(payload: {
  otpRequestId: string;
  otpCode: string;
  email?: string;
  purpose?: "register" | "forgot_password";
}) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("otp_requests")
    .select("*")
    .eq("id", payload.otpRequestId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "OTP request khong ton tai" };
  }
  if (payload.email && data.email !== payload.email) {
    return { ok: false, message: "Email khong khop OTP" };
  }
  if (payload.purpose && data.purpose !== payload.purpose) {
    return { ok: false, message: "OTP sai muc dich" };
  }
  if (data.verified_at) {
    return { ok: false, message: "OTP da duoc su dung" };
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "OTP da het han" };
  }

  const anon = createSupabaseAnonClient();
  const verifyResult = await anon.auth.verifyOtp({
    email: data.email,
    token: payload.otpCode.trim(),
    type: "email"
  });

  if (verifyResult.error) {
    await admin
      .from("otp_requests")
      .update({
        attempt_count: data.attempt_count + 1
      })
      .eq("id", data.id);

    return { ok: false, message: "OTP khong dung hoac da het han" };
  }

  await admin
    .from("otp_requests")
    .update({
      verified_at: new Date().toISOString(),
      attempt_count: data.attempt_count + 1
    })
    .eq("id", data.id);

  return {
    ok: true,
    message: "OK",
    otpRow: data,
    user: verifyResult.data.user ?? null,
    session: verifyResult.data.session ?? null
  };
}
