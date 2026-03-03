import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { eventCrudSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncEventRelations } from "@/lib/admin-events";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Khong du quyen", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return fail("Khong tai duoc su kien", 500, error.message);
  }
  if (!data) {
    return fail("Su kien khong ton tai", 404);
  }

  return ok(data);
}

export async function PATCH(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Khong du quyen", access.status);
  }

  const { id } = await context.params;
  const parsed = await parseBody(request, eventCrudSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("events")
    .update({
      slug: parsed.data.slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      event_type: parsed.data.eventType ?? null,
      location_text: parsed.data.locationText ?? null,
      country: parsed.data.country ?? null,
      status: parsed.data.status,
      updated_by: access.userId,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    return fail("Cap nhat su kien that bai", 500, error.message);
  }

  await syncEventRelations({
    eventId: id,
    tags: parsed.data.tags ?? [],
    people: parsed.data.people ?? [],
    places: parsed.data.places ?? [],
    sourceIds: parsed.data.sourceIds ?? [],
    imageUrls: parsed.data.imageUrls ?? []
  });

  return ok({ updated: true });
}

export async function DELETE(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chi admin moi duoc xoa su kien", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();

  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) {
    return fail("Xoa su kien that bai", 500, error.message);
  }

  return ok({ deleted: true });
}
