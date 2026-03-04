import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { eventCrudSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";

async function resolveUniqueSlug(baseValue: string) {
  const admin = createSupabaseAdmin();
  const normalizedBase = slugify(baseValue).slice(0, 160) || "su-kien";
  let attempt = 0;
  let nextSlug = normalizedBase;

  while (attempt < 50) {
    const { data, error } = await admin
      .from("events")
      .select("id")
      .eq("slug", nextSlug)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return nextSlug;
    }

    attempt += 1;
    nextSlug = `${normalizedBase}-${attempt + 1}`.slice(0, 160);
  }

  return `${normalizedBase}-${Date.now()}`.slice(0, 160);
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Khong du quyen truy cap", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events")
    .select("id, slug, title, status, event_type, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return fail("Khong tai duoc danh sach su kien", 500, error.message);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Khong du quyen", access.status);
  }

  const parsed = await parseBody(request, eventCrudSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const admin = createSupabaseAdmin();
  const slug = await resolveUniqueSlug(parsed.data.slug || parsed.data.title);
  const { data, error } = await admin
    .from("events")
    .insert({
      slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      event_type: parsed.data.eventType ?? null,
      location_text: parsed.data.locationText ?? null,
      country: parsed.data.country ?? null,
      status: parsed.data.status,
      created_by: access.userId,
      updated_by: access.userId
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return fail("Slug da ton tai. Hay doi tieu de hoac thu lai", 409, error.message);
    }
    return fail("Tao su kien that bai", 500, error?.message);
  }

  await syncEventRelations({
    eventId: data.id,
    tags: parsed.data.tags ?? [],
    people: parsed.data.people ?? [],
    places: parsed.data.places ?? [],
    sourceIds: parsed.data.sourceIds ?? [],
    imageUrls: parsed.data.imageUrls ?? []
  });

  return ok({ eventId: data.id }, 201);
}
