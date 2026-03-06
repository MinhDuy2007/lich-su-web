import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { sourceSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("sources")
    .select("id,name,url")
    .order("name", { ascending: true });
  if (error) {
    return fail("Không tải được nguồn", 500, error.message);
  }
  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const parsed = await parseBody(request, sourceSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("sources")
    .insert({
      name: parsed.data.name,
      url: parsed.data.url ?? null
    })
    .select("id")
    .single();
  if (error || !data) {
    return fail("Tạo nguồn thất bại", 500, error?.message);
  }
  return ok({ id: data.id }, 201);
}

