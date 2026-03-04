import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { readClientIp } from "@/lib/ip-ban";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Can dang nhap", 401);
  }

  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `account:password:change:${user.id}:${ip}`,
    limit: 10,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Ban dang doi mat khau qua nhanh", 429);
  }

  const payload = await request.json();
  const parsed = changePasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
  }

  const admin = createSupabaseAdmin();
  const profileResult = await admin
    .from("profiles")
    .select("email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileResult.error || !profileResult.data?.email) {
    return fail("Khong tim thay email tai khoan", 404, profileResult.error?.message);
  }

  const anon = createSupabaseAnonClient();
  const signInResult = await anon.auth.signInWithPassword({
    email: profileResult.data.email,
    password: parsed.data.currentPassword
  });
  if (signInResult.error) {
    return fail("Mat khau hien tai khong dung", 400);
  }

  const updateResult = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.newPassword
  });
  if (updateResult.error) {
    return fail("Khong doi duoc mat khau", 500, updateResult.error.message);
  }

  return ok({ changed: true });
}
