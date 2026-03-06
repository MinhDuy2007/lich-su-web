import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeIpAddress } from "@/lib/user-ip-log";

export async function isIpBanned(ipAddress: string | null | undefined) {
  const normalizedIp = normalizeIpAddress(ipAddress);
  if (!normalizedIp) return false;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ip_bans")
    .select("id")
    .eq("ip_address", normalizedIp)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export function readClientIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return normalizeIpAddress(xff.split(",")[0] ?? null);
  }
  return normalizeIpAddress(request.headers.get("x-real-ip"));
}
