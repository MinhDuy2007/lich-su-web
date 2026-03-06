import { createSupabaseAdmin } from "@/lib/supabase/admin";

export function normalizeIpAddress(ipAddress: string | null | undefined) {
  if (!ipAddress) return null;
  let normalized = ipAddress.trim();
  if (!normalized) return null;
  if (normalized === "::1") {
    normalized = "127.0.0.1";
  } else if (normalized.toLowerCase().startsWith("::ffff:")) {
    normalized = normalized.slice(7);
  }
  return normalized.slice(0, 64);
}

export async function trackUserIp(
  userId: string,
  ipAddress: string | null | undefined,
  userAgent?: string | null
) {
  const ip = normalizeIpAddress(ipAddress);
  if (!ip) {
    return;
  }

  const admin = createSupabaseAdmin();
  const current = await admin
    .from("user_ip_logs")
    .select("id,seen_count")
    .eq("user_id", userId)
    .eq("ip_address", ip)
    .maybeSingle();

  if (current.error) {
    throw new Error(current.error.message);
  }

  if (current.data?.id) {
    const { error } = await admin
      .from("user_ip_logs")
      .update({
        seen_count: (current.data.seen_count ?? 0) + 1,
        last_seen_at: new Date().toISOString(),
        last_user_agent: userAgent ?? null
      })
      .eq("id", current.data.id);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await admin.from("user_ip_logs").insert({
    user_id: userId,
    ip_address: ip,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    seen_count: 1,
    last_user_agent: userAgent ?? null
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadLatestRoleByUserIds(userIds: string[]) {
  const targets = Array.from(new Set(userIds.filter(Boolean)));
  if (targets.length === 0) {
    return new Map<string, "user" | "moderator" | "admin">();
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("user_roles")
    .select("user_id,role,created_at")
    .in("user_id", targets)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, "user" | "moderator" | "admin">();
  (data ?? []).forEach((row) => {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, row.role as "user" | "moderator" | "admin");
    }
  });

  return map;
}
