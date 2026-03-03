import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function getProfileByUserId(userId: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserRoleByUserId(userId: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as "user" | "moderator" | "admin" | undefined) ?? "user";
}

