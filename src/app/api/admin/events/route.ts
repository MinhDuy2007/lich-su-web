import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { eventCrudSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";
import { extractImageUrlsFromHtml, sanitizeRichContentHtml } from "@/lib/rich-content";
import { resolveSourceIds } from "@/lib/event-sources";
import { buildEventDateColumns, getDefaultEventStatusForRole } from "@/lib/event-persistence";
import { isMissingColumnError } from "@/lib/db-compat";
import { pushNotificationToUsers } from "@/lib/notifications";
import { loadLatestRoleByUserIds } from "@/lib/user-ip-log";

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

async function fetchAdminUserIds(admin: ReturnType<typeof createSupabaseAdmin>) {
  const rolesResult = await admin
    .from("user_roles")
    .select("user_id,role,created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  const seen = new Set<string>();
  const userIds: string[] = [];
  for (const row of rolesResult.data ?? []) {
    if (!row.user_id || seen.has(row.user_id)) {
      continue;
    }
    seen.add(row.user_id);
    userIds.push(row.user_id);
  }

  return userIds;
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền truy cập", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events")
    .select("id, slug, title, status, event_type, updated_at, created_by")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return fail("Không tải được danh sách sự kiện", 500, error.message);
  }

  const items = data ?? [];
  const eventIds = items.map((item) => item.id).filter((value): value is string => Boolean(value));

  const contributorByEvent = new Map<
    string,
    {
      displayName: string | null;
      username: string | null;
      role: "user" | "moderator" | "admin" | null;
    }
  >();

  if (eventIds.length > 0) {
    const contributorUserByEvent = new Map<string, string>();

    const submissionsResult = await admin
      .from("event_submissions")
      .select("approved_event_id,submitted_by,created_at")
      .in("approved_event_id", eventIds)
      .order("created_at", { ascending: false });

    if (!submissionsResult.error) {
      (submissionsResult.data ?? []).forEach((row) => {
        if (!row.approved_event_id || !row.submitted_by) {
          return;
        }
        if (!contributorUserByEvent.has(row.approved_event_id)) {
          contributorUserByEvent.set(row.approved_event_id, row.submitted_by);
        }
      });
    }

    for (const eventItem of items) {
      if (!eventItem.id || !eventItem.created_by) {
        continue;
      }
      if (!contributorUserByEvent.has(eventItem.id)) {
        contributorUserByEvent.set(eventItem.id, eventItem.created_by);
      }
    }

    const contributorUserIds = Array.from(new Set(Array.from(contributorUserByEvent.values())));
    if (contributorUserIds.length > 0) {
      const [profileResult, roleResult] = await Promise.all([
        admin
          .from("profiles")
          .select("user_id,display_name,username")
          .in("user_id", contributorUserIds),
        loadLatestRoleByUserIds(contributorUserIds).catch(
          () => new Map<string, "user" | "moderator" | "admin">()
        )
      ]);

      const profileMap = new Map<string, { displayName: string; username: string | null }>();
      if (!profileResult.error) {
        (profileResult.data ?? []).forEach((profile) => {
          profileMap.set(profile.user_id, {
            displayName: profile.display_name || profile.username || "Người dùng",
            username: profile.username ?? null
          });
        });
      }

      contributorUserByEvent.forEach((userId, eventId) => {
        const profile = profileMap.get(userId);
        contributorByEvent.set(eventId, {
          displayName: profile?.displayName ?? "Người dùng",
          username: profile?.username ?? null,
          role: roleResult.get(userId) ?? null
        });
      });
    }
  }

  return ok({
    items: items.map((item) => {
      const contributor = contributorByEvent.get(item.id);
      return {
        ...item,
        contributor_display_name: contributor?.displayName ?? null,
        contributor_username: contributor?.username ?? null,
        contributor_role: contributor?.role ?? null
      };
    })
  });
}

function isMissingFlexibleDateColumnsError(
  error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
  } | null
) {
  return isMissingColumnError(error, [
    "start_year",
    "start_month",
    "start_day",
    "start_precision",
    "end_year",
    "end_month",
    "end_day",
    "end_precision"
  ]);
}

function isPendingStatusNotSupportedError(
  error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
  } | null,
  status: string
) {
  if (status !== "pending" || !error) {
    return false;
  }

  if (error.code !== "22P02") {
    return false;
  }

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return message.includes("event_status") && message.includes("pending");
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
  const payload = parsed.data;

  const admin = createSupabaseAdmin();
  const slug = await resolveUniqueSlug(payload.slug || payload.title);
  const safeContent = sanitizeRichContentHtml(payload.content);
  if (!safeContent) {
    return fail("Nội dung sự kiện không hợp lệ", 400);
  }

  const mergedImageUrls = Array.from(
    new Set([...(payload.imageUrls ?? []), ...extractImageUrlsFromHtml(safeContent)])
  );
  let mergedSourceIds: string[] = [];
  try {
    mergedSourceIds = await resolveSourceIds(
      admin,
      payload.sourceIds ?? [],
      payload.customSources ?? []
    );
  } catch (error) {
    return fail(
      "Không xử lý được nguồn sự kiện",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }

  const dateColumns = buildEventDateColumns(payload);
  const defaultStatus = getDefaultEventStatusForRole(access.role);

  async function insertEvent(preferredStatus: "draft" | "pending" | "published" | "rejected") {
    let nextResult = await admin
      .from("events")
      .insert({
        slug,
        title: payload.title,
        summary: payload.summary,
        content: safeContent,
        ...dateColumns,
        event_type: payload.eventType ?? null,
        location_text: payload.locationText ?? null,
        country: payload.country ?? null,
        status: preferredStatus,
        created_by: access.userId,
        updated_by: access.userId
      })
      .select("id,status")
      .single();

    if (isMissingFlexibleDateColumnsError(nextResult.error)) {
      nextResult = await admin
        .from("events")
        .insert({
          slug,
          title: payload.title,
          summary: payload.summary,
          content: safeContent,
          start_date: dateColumns.start_date,
          end_date: dateColumns.end_date,
          event_type: payload.eventType ?? null,
          location_text: payload.locationText ?? null,
          country: payload.country ?? null,
          status: preferredStatus,
          created_by: access.userId,
          updated_by: access.userId
        })
        .select("id,status")
        .single();
    }

    return nextResult;
  }

  let insertResult = await insertEvent(defaultStatus);
  if (isPendingStatusNotSupportedError(insertResult.error, defaultStatus)) {
    insertResult = await insertEvent("draft");
  }

  const { data, error } = insertResult;

  if (error || !data) {
    if (error?.code === "23505") {
      return fail("Đường dẫn đã tồn tại. Hãy đổi tiêu đề hoặc thử lại", 409, error.message);
    }
    return fail("Tạo sự kiện thất bại", 500, error?.message);
  }

  await syncEventRelations({
    eventId: data.id,
    tags: payload.tags ?? [],
    people: payload.people ?? [],
    places: payload.places ?? [],
    sourceIds: mergedSourceIds,
    imageUrls: mergedImageUrls
  });

  try {
    const createdStatus = data.status ?? defaultStatus;
    if (access.role === "moderator" && createdStatus === "pending") {
      const adminIds = await fetchAdminUserIds(admin);
      const notifyIds = adminIds.filter((userId) => userId !== access.userId);
      if (notifyIds.length > 0) {
        const profileResult = await admin
          .from("profiles")
          .select("username,display_name")
          .eq("user_id", access.userId)
          .maybeSingle();

        const actorUsername = profileResult.data?.username?.trim() || "";
        const actorDisplayName =
          profileResult.data?.display_name?.trim() ||
          profileResult.data?.username?.trim() ||
          "Kiểm duyệt viên";
        const actorLabel = actorUsername
          ? `${actorDisplayName} (@${actorUsername})`
          : actorDisplayName;

        await pushNotificationToUsers(admin, notifyIds, {
          type: "admin_broadcast",
          title: "Có bài viết mới từ kiểm duyệt viên",
          body: `${actorLabel} vừa gửi bài "${payload.title}". Vui lòng vào mục kiểm duyệt để xem xét.`,
          link: "/admin/kiem-duyet?tab=bai-viet-kiem-duyet-vien",
          metadata: {
            eventId: data.id,
            submittedBy: access.userId,
            submittedByUsername: actorUsername || null,
            submittedByRole: "moderator",
            status: createdStatus
          }
        });
      }
    }
  } catch {
    // Do not fail event creation when notification insertion fails.
  }

  return ok({ eventId: data.id }, 201);
}
