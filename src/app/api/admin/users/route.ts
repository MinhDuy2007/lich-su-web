import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chi admin moi duoc truy cap", access.status);
  }

  const admin = createSupabaseAdmin();

  const [profilesResult, rolesResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id,username,email,is_banned")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("user_roles")
      .select("user_id,role,created_at")
      .order("created_at", { ascending: false })
  ]);

  if (profilesResult.error) {
    return fail("Khong tai duoc danh sach profile", 500, profilesResult.error.message);
  }
  if (rolesResult.error) {
    return fail("Khong tai duoc role", 500, rolesResult.error.message);
  }

  const latestRoleMap = new Map<string, string>();
  (rolesResult.data ?? []).forEach((row) => {
    if (!latestRoleMap.has(row.user_id)) {
      latestRoleMap.set(row.user_id, row.role);
    }
  });

  const items = (profilesResult.data ?? []).map((profile) => ({
    ...profile,
    role: latestRoleMap.get(profile.user_id) ?? "user"
  }));

  return ok({ items });
}

