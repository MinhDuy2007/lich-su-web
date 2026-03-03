import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chi admin moi duoc go chan IP", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ip_bans").delete().eq("id", id);
  if (error) {
    return fail("Go chan IP that bai", 500, error.message);
  }

  return ok({ deleted: true });
}

