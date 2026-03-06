import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { eventCrudSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";
import { extractImageUrlsFromHtml, sanitizeRichContentHtml } from "@/lib/rich-content";

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

interface CustomSourceInput {
  name: string;
  url?: string | null;
}

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

function normalizeSourceName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 255);
}

function normalizeSourceUrl(value: string | null | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue.length > 0 ? nextValue : null;
}

async function resolveSourceIds(
  admin: AdminClient,
  sourceIds: string[],
  customSources: CustomSourceInput[]
) {
  const mergedIds = new Set(sourceIds);

  for (const source of customSources) {
    const normalizedName = normalizeSourceName(source.name);
    if (!normalizedName) {
      continue;
    }

    const normalizedUrl = normalizeSourceUrl(source.url);
    const existingResult = await admin
      .from("sources")
      .select("id,url")
      .eq("name", normalizedName)
      .order("created_at", { ascending: false })
      .limit(20);

    if (existingResult.error) {
      throw new Error(existingResult.error.message);
    }

    const existingRows = existingResult.data ?? [];
    const matchedRow = existingRows.find((row) => (row.url ?? null) === normalizedUrl);
    const fallbackRow = existingRows[0];
    const targetRow = matchedRow ?? fallbackRow;

    if (targetRow?.id) {
      mergedIds.add(targetRow.id);
      continue;
    }

    const insertResult = await admin
      .from("sources")
      .insert({
        name: normalizedName,
        url: normalizedUrl
      })
      .select("id")
      .single();

    if (insertResult.error || !insertResult.data?.id) {
      throw new Error(insertResult.error?.message ?? "Không thêm được nguồn mới");
    }

    mergedIds.add(insertResult.data.id);
  }

  return Array.from(mergedIds);
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền truy cập", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events")
    .select("id, slug, title, status, event_type, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return fail("Không tải được danh sách sự kiện", 500, error.message);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Không đủ quyền", access.status);
  }

  const parsed = await parseBody(request, eventCrudSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Dữ liệu không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const slug = await resolveUniqueSlug(parsed.data.slug || parsed.data.title);
  const safeContent = sanitizeRichContentHtml(parsed.data.content);
  if (!safeContent) {
    return fail("Nội dung sự kiện không hợp lệ", 400);
  }

  const mergedImageUrls = Array.from(
    new Set([...(parsed.data.imageUrls ?? []), ...extractImageUrlsFromHtml(safeContent)])
  );
  let mergedSourceIds: string[] = [];
  try {
    mergedSourceIds = await resolveSourceIds(
      admin,
      parsed.data.sourceIds ?? [],
      parsed.data.customSources ?? []
    );
  } catch (error) {
    return fail(
      "Không xử lý được nguồn sự kiện",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }

  const { data, error } = await admin
    .from("events")
    .insert({
      slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: safeContent,
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
      return fail("Đường dẫn đã tồn tại. Hãy đổi tiêu đề hoặc thử lại", 409, error.message);
    }
    return fail("Tạo sự kiện thất bại", 500, error?.message);
  }

  await syncEventRelations({
    eventId: data.id,
    tags: parsed.data.tags ?? [],
    people: parsed.data.people ?? [],
    places: parsed.data.places ?? [],
    sourceIds: mergedSourceIds,
    imageUrls: mergedImageUrls
  });

  return ok({ eventId: data.id }, 201);
}
