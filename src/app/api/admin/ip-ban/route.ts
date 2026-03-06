import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBody } from "@/lib/parse-body";
import { ipBanSchema } from "@/lib/validation";
import { loadLatestRoleByUserIds, normalizeIpAddress } from "@/lib/user-ip-log";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được xem danh sách IP chặn", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ip_bans")
    .select("id,ip_address,reason,is_active,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return fail("Không tải được danh sách IP chặn", 500, error.message);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được thêm IP chặn", access.status);
  }

  const parsed = await parseBody(request, ipBanSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const ipAddress = normalizeIpAddress(parsed.data.ipAddress);
  if (!ipAddress) {
    return fail("Địa chỉ IP không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();

  let affectedUsers = 0;
  if (parsed.data.isActive) {
    const ipUsersResult = await admin
      .from("user_ip_logs")
      .select("user_id")
      .eq("ip_address", ipAddress);

    if (ipUsersResult.error && ipUsersResult.error.code !== "42P01") {
      return fail("Không tải được danh sách tài khoản theo IP", 500, ipUsersResult.error.message);
    }

    const targetUserIds = Array.from(
      new Set((ipUsersResult.data ?? []).map((row) => row.user_id).filter(Boolean))
    );

    if (targetUserIds.length > 0) {
      const latestRoleMap = await loadLatestRoleByUserIds(targetUserIds);
      const adminUsers = targetUserIds.filter((userId) => latestRoleMap.get(userId) === "admin");
      if (adminUsers.length > 0) {
        return fail("IP này có tài khoản admin, hệ thống không cho phép chặn", 400);
      }

      const banTargets = targetUserIds.filter((userId) => latestRoleMap.get(userId) !== "admin");
      if (banTargets.length > 0) {
        const banResult = await admin
          .from("profiles")
          .update({ is_banned: true })
          .in("user_id", banTargets);

        if (banResult.error) {
          return fail("Đã chặn IP nhưng không khóa được tài khoản liên quan", 500, banResult.error.message);
        }
        affectedUsers = banTargets.length;
      }
    }
  }

  const { data, error } = await admin
    .from("ip_bans")
    .upsert(
      {
        ip_address: ipAddress,
        reason: parsed.data.reason ?? null,
        is_active: parsed.data.isActive
      },
      {
        onConflict: "ip_address"
      }
    )
    .select("id")
    .single();

  if (error || !data) {
    return fail("Cập nhật danh sách IP chặn thất bại", 500, error?.message);
  }

  return ok({ id: data.id, affectedUsers }, 201);
}
