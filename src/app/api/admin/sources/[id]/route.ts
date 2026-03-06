import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("sources").delete().eq("id", id);
  if (error) {
    return fail("Xóa nguồn thất bại", 500, error.message);
  }
  return ok({ deleted: true });
}

