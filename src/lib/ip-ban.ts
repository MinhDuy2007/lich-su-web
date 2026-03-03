import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function isIpBanned(ipAddress: string | null | undefined) {
  if (!ipAddress) return false;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ip_bans")
    .select("id")
    .eq("ip_address", ipAddress)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export function readClientIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

