import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBody } from "@/lib/parse-body";
import { ipBanSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chi admin moi duoc xem danh sach IP chan", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ip_bans")
    .select("id,ip_address,reason,is_active,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return fail("Khong tai duoc danh sach IP chan", 500, error.message);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chi admin moi duoc them IP chan", access.status);
  }

  const parsed = await parseBody(request, ipBanSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ip_bans")
    .insert({
      ip_address: parsed.data.ipAddress,
      reason: parsed.data.reason ?? null,
      is_active: parsed.data.isActive
    })
    .select("id")
    .single();
  if (error || !data) {
    return fail("Them IP chan that bai", 500, error?.message);
  }

  return ok({ id: data.id }, 201);
}

