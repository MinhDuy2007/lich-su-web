import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBody } from "@/lib/parse-body";
import { moderationActionSchema } from "@/lib/validation";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";
import { pushNotificationToUser, pushNotificationToUsers } from "@/lib/notifications";
import { resolveSourceIds } from "@/lib/event-sources";
import { isMissingColumnError } from "@/lib/db-compat";
import { sanitizeRichContentHtml } from "@/lib/rich-content";
import { loadLatestRoleByUserIds } from "@/lib/user-ip-log";

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

async function fetchStaffUserIds(admin: ReturnType<typeof createSupabaseAdmin>) {
  const staffRolesResult = await admin
    .from("user_roles")
    .select("user_id,role,created_at")
    .in("role", ["admin", "moderator"])
    .order("created_at", { ascending: false });

  if (staffRolesResult.error) {
    throw new Error(staffRolesResult.error.message);
  }

  const seen = new Set<string>();
  const staffIds: string[] = [];
  for (const row of staffRolesResult.data ?? []) {
    if (!row.user_id || seen.has(row.user_id)) {
      continue;
    }
    seen.add(row.user_id);
    staffIds.push(row.user_id);
  }

  return staffIds;
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return fail("Không tải được danh sách kiểm duyệt", 500, error.message);
  }

  const items = data ?? [];
  const submitterIds = Array.from(
    new Set(items.map((item) => item.submitted_by).filter((value): value is string => Boolean(value)))
  );

  const submitterMap = new Map<
    string,
    {
      username: string;
      displayName: string;
      role: "user" | "moderator" | "admin" | null;
    }
  >();

  if (submitterIds.length > 0) {
    let roleMap = new Map<string, "user" | "moderator" | "admin">();
    try {
      roleMap = await loadLatestRoleByUserIds(submitterIds);
    } catch {
      roleMap = new Map<string, "user" | "moderator" | "admin">();
    }

    submitterIds.forEach((userId) => {
      submitterMap.set(userId, {
        username: "nguoi-dung",
        displayName: "Người dùng",
        role: roleMap.get(userId) ?? null
      });
    });

    const profileResult = await admin
      .from("profiles")
      .select("user_id,username,display_name")
      .in("user_id", submitterIds);

    if (!profileResult.error) {
      (profileResult.data ?? []).forEach((profile) => {
        submitterMap.set(profile.user_id, {
          username: profile.username ?? "nguoi-dung",
          displayName: profile.display_name || profile.username || "Người dùng",
          role: roleMap.get(profile.user_id) ?? null
        });
      });
    }
  }

  return ok({
    items: items.map((item) => ({
      ...item,
      submitter: item.submitted_by
        ? {
            userId: item.submitted_by,
            username: submitterMap.get(item.submitted_by)?.username ?? "nguoi-dung",
            displayName: submitterMap.get(item.submitted_by)?.displayName ?? "Người dùng",
            role: submitterMap.get(item.submitted_by)?.role ?? null
          }
        : null
    }))
  });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok || !access.userId) {
    return fail("Chỉ admin mới được duyệt đề xuất", access.status);
  }

  const parsed = await parseBody(request, moderationActionSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const { data: submission, error: submissionError } = await admin
    .from("event_submissions")
    .select("*")
    .eq("id", parsed.data.submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    return fail("Không tìm thấy bài gửi", 404);
  }
  if (submission.status !== "pending") {
    return fail("Bài gửi đã được xử lý", 400);
  }

  if (parsed.data.action === "reject") {
    const { error } = await admin
      .from("event_submissions")
      .update({
        status: "rejected",
        reviewed_by: access.userId,
        reviewed_at: new Date().toISOString(),
        review_note: parsed.data.note ?? null
      })
      .eq("id", submission.id);
    if (error) {
      return fail("Từ chối bài gửi thất bại", 500, error.message);
    }

    try {
      if (submission.submitted_by) {
        await pushNotificationToUser(admin, submission.submitted_by, {
          type: "submission_reviewed",
          title: "Đề xuất đã được xử lý",
          body: "Đề xuất của bạn đã bị từ chối. Vui lòng mở thông báo để xem ghi chú.",
          link: "/thong-bao"
        });
      }
    } catch {
      // Do not fail moderation when notification insertion fails.
    }

    try {
      const staffIds = await fetchStaffUserIds(admin);
      const notifyIds = staffIds.filter((userId) => userId !== access.userId);
      if (notifyIds.length > 0) {
        await pushNotificationToUsers(admin, notifyIds, {
          type: "admin_broadcast",
          title: "Có đề xuất bị từ chối",
          body: `Đề xuất "${submission.title}" đã được admin từ chối.`,
          link: "/admin/kiem-duyet",
          metadata: {
            submissionId: submission.id,
            action: "reject"
          }
        });
      }
    } catch {
      // Do not fail moderation when staff notification insertion fails.
    }

    return ok({ reviewed: true });
  }

  let mergedSourceIds: string[] = [];
  try {
    mergedSourceIds = await resolveSourceIds(
      admin,
      submission.source_ids ?? [],
      Array.isArray(submission.custom_sources) ? submission.custom_sources : []
    );
  } catch (error) {
    return fail(
      "Không xử lý được nguồn đi kèm bài gửi",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }

  const safeContent = sanitizeRichContentHtml(submission.content ?? "");
  if (!safeContent) {
    return fail("Nội dung đề xuất không hợp lệ sau khi làm sạch dữ liệu", 400);
  }

  const slug = await resolveUniqueSlug(submission.title);

  async function createDraftEvent() {
    let nextResult = await admin
      .from("events")
      .insert({
        slug,
        title: submission.title,
        summary: submission.summary,
        content: safeContent,
        start_date: submission.start_date,
        end_date: submission.end_date,
        start_year: submission.start_year,
        start_month: submission.start_month,
        start_day: submission.start_day,
        start_precision: submission.start_precision ?? "unknown",
        end_year: submission.end_year,
        end_month: submission.end_month,
        end_day: submission.end_day,
        end_precision: submission.end_precision ?? "unknown",
        event_type: submission.event_type,
        location_text: submission.location_text,
        country: submission.country,
        status: "draft",
        created_by: access.userId,
        updated_by: access.userId
      })
      .select("id,slug")
      .single();

    if (isMissingFlexibleDateColumnsError(nextResult.error)) {
      nextResult = await admin
        .from("events")
        .insert({
          slug,
          title: submission.title,
          summary: submission.summary,
          content: safeContent,
          start_date: submission.start_date,
          end_date: submission.end_date,
          event_type: submission.event_type,
          location_text: submission.location_text,
          country: submission.country,
          status: "draft",
          created_by: access.userId,
          updated_by: access.userId
        })
        .select("id,slug")
        .single();
    }

    return nextResult;
  }

  const insertResult = await createDraftEvent();
  if (insertResult.error || !insertResult.data) {
    return fail("Không tạo được bản nháp từ đề xuất", 500, insertResult.error?.message);
  }

  await syncEventRelations({
    eventId: insertResult.data.id,
    tags: submission.tags ?? [],
    people: submission.people ?? [],
    places: submission.places ?? [],
    sourceIds: mergedSourceIds,
    imageUrls: submission.image_urls ?? []
  });

  const { error: updateSubmissionError } = await admin
    .from("event_submissions")
    .update({
      status: "approved",
      approved_event_id: insertResult.data.id,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note ?? null
    })
    .eq("id", submission.id);

  if (updateSubmissionError) {
    return fail(
      "Đã tạo bản nháp nhưng cập nhật bài gửi thất bại",
      500,
      updateSubmissionError.message
    );
  }

  try {
    if (submission.submitted_by) {
      await pushNotificationToUser(admin, submission.submitted_by, {
        type: "submission_reviewed",
        title: "Đề xuất đã được duyệt",
        body: "Đề xuất của bạn đã được duyệt và chuyển thành bản nháp để admin biên tập trước khi xuất bản.",
        link: "/thong-bao",
        metadata: {
          submissionId: submission.id,
          eventId: insertResult.data.id,
          workflow: "draft_pending_publish"
        }
      });
    }
  } catch {
    // Do not fail moderation when notification insertion fails.
  }

  try {
    const staffIds = await fetchStaffUserIds(admin);
    const notifyIds = staffIds.filter((userId) => userId !== access.userId);
    if (notifyIds.length > 0) {
      await pushNotificationToUsers(admin, notifyIds, {
        type: "admin_broadcast",
        title: "Có đề xuất đã được duyệt",
        body: `Đề xuất "${submission.title}" đã được duyệt và chuyển sang bản nháp.`,
        link: "/admin/su-kien",
        metadata: {
          submissionId: submission.id,
          eventId: insertResult.data.id,
          action: "approve_to_draft"
        }
      });
    }
  } catch {
    // Do not fail moderation when staff notification insertion fails.
  }

  return ok({
    reviewed: true,
    eventId: insertResult.data.id,
    status: "draft"
  });
}
