import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function isMissingTableError(
  error: { code?: string | null; message?: string | null } | null,
  tableName: string
) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được xem yêu cầu hỗ trợ", access.status);
  }

  const admin = createSupabaseAdmin();
  const result = await admin
    .from("support_requests")
    .select("id,email,full_name,phone,message,created_at,submitted_by")
    .order("created_at", { ascending: false })
    .limit(100);

  if (result.error) {
    if (isMissingTableError(result.error, "support_requests")) {
      return ok({ items: [] });
    }
    return fail("Không tải được yêu cầu hỗ trợ", 500, result.error.message);
  }

  return ok({
    items: (result.data ?? []).map((item) => ({
      id: item.id,
      email: item.email,
      fullName: item.full_name,
      phone: item.phone,
      message: item.message,
      createdAt: item.created_at,
      submittedBy: item.submitted_by
    }))
  });
}
