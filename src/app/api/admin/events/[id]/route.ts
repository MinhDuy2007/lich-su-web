import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { eventCrudSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";
import { extractImageUrlsFromHtml, sanitizeRichContentHtml } from "@/lib/rich-content";
import { pushNotificationToUsers } from "@/lib/notifications";

interface Params {
  params: Promise<{ id: string }>;
}

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

interface CustomSourceInput {
  name: string;
  url?: string | null;
}

async function resolveUniqueSlugForUpdate(eventId: string, baseValue: string) {
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
    if (!data || data.id === eventId) {
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

export async function GET(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return fail("Không tải được sự kiện", 500, error.message);
  }
  if (!data) {
    return fail("Sự kiện không tồn tại", 404);
  }

  return ok(data);
}

export async function PATCH(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Không đủ quyền", access.status);
  }

  const { id } = await context.params;
  const parsed = await parseBody(request, eventCrudSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Dữ liệu không hợp lệ", 400);
  }

  const slug = await resolveUniqueSlugForUpdate(id, parsed.data.slug || parsed.data.title);
  const safeContent = sanitizeRichContentHtml(parsed.data.content);
  if (!safeContent) {
    return fail("Nội dung sự kiện không hợp lệ", 400);
  }

  const mergedImageUrls = Array.from(
    new Set([...(parsed.data.imageUrls ?? []), ...extractImageUrlsFromHtml(safeContent)])
  );

  const admin = createSupabaseAdmin();
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
  const { error } = await admin
    .from("events")
    .update({
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
      updated_by: access.userId,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return fail("Đường dẫn đã tồn tại. Hãy đổi tiêu đề hoặc thử lại", 409, error.message);
    }
    return fail("Cập nhật sự kiện thất bại", 500, error.message);
  }

  await syncEventRelations({
    eventId: id,
    tags: parsed.data.tags ?? [],
    people: parsed.data.people ?? [],
    places: parsed.data.places ?? [],
    sourceIds: mergedSourceIds,
    imageUrls: mergedImageUrls
  });

  try {
    const { data: followers } = await admin
      .from("event_follows")
      .select("user_id")
      .eq("event_id", id);

    const followerIds = (followers ?? [])
      .map((row) => row.user_id)
      .filter((userId): userId is string => Boolean(userId));

    if (followerIds.length > 0) {
      await pushNotificationToUsers(admin, followerIds, {
        type: "event_updated",
        title: "Bài viết theo dõi đã cập nhật",
        body: `Bài viết \"${parsed.data.title}\" vừa được cập nhật nội dung mới.`,
        link: `/su-kien/${slug}`,
        metadata: {
          eventId: id,
          slug
        }
      });
    }
  } catch {
    // Do not fail event update when notification insertion fails.
  }

  return ok({ updated: true });
}

export async function DELETE(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được xóa sự kiện", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();

  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) {
    return fail("Xóa sự kiện thất bại", 500, error.message);
  }

  return ok({ deleted: true });
}
