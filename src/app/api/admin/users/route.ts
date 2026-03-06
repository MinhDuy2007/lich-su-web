import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface RoleRow {
  user_id: string;
  role: "user" | "moderator" | "admin";
}

interface IpLogRow {
  user_id: string;
  ip_address: string;
  last_seen_at: string;
}

function buildLatestRoleMap(rows: RoleRow[]) {
  const map = new Map<string, RoleRow["role"]>();
  rows.forEach((row) => {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, row.role);
    }
  });
  return map;
}

function parseDate(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được truy cập", access.status);
  }

  const admin = createSupabaseAdmin();

  const [profilesResult, rolesResult, logsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id,username,email,is_banned")
      .order("created_at", { ascending: false })
      .limit(300),
    admin
      .from("user_roles")
      .select("user_id,role,created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("user_ip_logs")
      .select("user_id,ip_address,last_seen_at")
      .order("last_seen_at", { ascending: false })
  ]);

  if (profilesResult.error) {
    return fail("Không tải được danh sách hồ sơ", 500, profilesResult.error.message);
  }
  if (rolesResult.error) {
    return fail("Không tải được danh sách vai trò", 500, rolesResult.error.message);
  }

  const roleMap = buildLatestRoleMap((rolesResult.data ?? []) as RoleRow[]);
  const ipRows = logsResult.error && logsResult.error.code === "42P01"
    ? ([] as IpLogRow[])
    : ((logsResult.data ?? []) as IpLogRow[]);

  if (logsResult.error && logsResult.error.code !== "42P01") {
    return fail("Không tải được nhật ký IP", 500, logsResult.error.message);
  }

  const userIpMap = new Map<string, string[]>();
  const latestIpByUser = new Map<string, { ip: string; seenAt: number }>();

  ipRows.forEach((row) => {
    const list = userIpMap.get(row.user_id) ?? [];
    if (!list.includes(row.ip_address)) {
      list.push(row.ip_address);
      userIpMap.set(row.user_id, list);
    }

    const time = parseDate(row.last_seen_at);
    const latest = latestIpByUser.get(row.user_id);
    if (!latest || time > latest.seenAt) {
      latestIpByUser.set(row.user_id, { ip: row.ip_address, seenAt: time });
    }
  });

  const ipGroupsMap = new Map<string, string[]>();
  ipRows.forEach((row) => {
    const list = ipGroupsMap.get(row.ip_address) ?? [];
    if (!list.includes(row.user_id)) {
      list.push(row.user_id);
      ipGroupsMap.set(row.ip_address, list);
    }
  });

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.user_id, profile])
  );

  const items = (profilesResult.data ?? []).map((profile) => {
    const lastIp = latestIpByUser.get(profile.user_id)?.ip ?? null;
    const sharedUsers = lastIp ? ipGroupsMap.get(lastIp)?.length ?? 0 : 0;

    return {
      ...profile,
      role: roleMap.get(profile.user_id) ?? "user",
      lastIp,
      ipCount: userIpMap.get(profile.user_id)?.length ?? 0,
      sharedIpUsers: sharedUsers
    };
  });

  const ipGroups = Array.from(ipGroupsMap.entries())
    .map(([ipAddress, userIds]) => {
      const users = userIds
        .map((userId) => {
          const profile = profileMap.get(userId);
          if (!profile) return null;
          const role = roleMap.get(userId) ?? "user";
          return {
            userId,
            username: profile.username,
            email: profile.email,
            role,
            isBanned: profile.is_banned
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value));

      const hasAdmin = users.some((user) => user.role === "admin");
      return {
        ipAddress,
        userCount: users.length,
        hasAdmin,
        users
      };
    })
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 200);

  return ok({ items, ipGroups });
}
