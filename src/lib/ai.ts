import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function ensureAiQuota(userId: string, limit = 20) {
  const admin = createSupabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("ai_usage_daily")
    .select("id,used_count")
    .eq("user_id", userId)
    .eq("usage_date", day)
    .maybeSingle();
  if (error) {
    throw error;
  }

  if (!data) {
    await admin.from("ai_usage_daily").insert({
      user_id: userId,
      usage_date: day,
      used_count: 0
    });
    return {
      usedCount: 0,
      remaining: limit
    };
  }

  return {
    usedCount: data.used_count,
    remaining: Math.max(0, limit - data.used_count)
  };
}

export async function increaseAiUsage(userId: string) {
  const admin = createSupabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("ai_usage_daily")
    .select("id,used_count")
    .eq("user_id", userId)
    .eq("usage_date", day)
    .maybeSingle();

  if (!data) {
    await admin.from("ai_usage_daily").insert({
      user_id: userId,
      usage_date: day,
      used_count: 1
    });
    return;
  }

  await admin
    .from("ai_usage_daily")
    .update({
      used_count: data.used_count + 1
    })
    .eq("id", data.id);
}
