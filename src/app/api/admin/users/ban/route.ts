import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { userBanSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được khóa tài khoản", access.status);
  }

  const parsed = await parseBody(request, userBanSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const rolesResult = await admin
    .from("user_roles")
    .select("role,created_at")
    .eq("user_id", parsed.data.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rolesResult.error) {
    return fail("Không tải được vai trò tài khoản", 500, rolesResult.error.message);
  }

  if (rolesResult.data?.role === "admin") {
    return fail("Không thể khóa tài khoản có quyền admin", 400);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      is_banned: parsed.data.isBanned
    })
    .eq("user_id", parsed.data.userId);

  if (error) {
    return fail("Cập nhật trạng thái tài khoản thất bại", 500, error.message);
  }

  return ok({ updated: true });
}
