import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { roleUpdateSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok || !access.userId) {
    return fail("Chi admin moi duoc cap nhat role", access.status);
  }

  const parsed = await parseBody(request, roleUpdateSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("user_roles").insert({
    user_id: parsed.data.userId,
    role: parsed.data.role,
    granted_by: access.userId
  });
  if (error) {
    return fail("Cap nhat role that bai", 500, error.message);
  }

  return ok({ updated: true });
}

