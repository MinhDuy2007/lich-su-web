import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { pushNotificationToUser } from "@/lib/notifications";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { loadLatestRoleByUserIds } from "@/lib/user-ip-log";
import { moderatorEventReviewSchema } from "@/lib/validation";

interface ModeratorEventRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  slug: string;
  status: "draft" | "pending" | "published" | "rejected";
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const admin = createSupabaseAdmin();
  const pendingResult = await admin
    .from("events")
    .select("id,title,summary,content,slug,status,created_at,updated_at,created_by")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (pendingResult.error) {
    return fail("Không tải được bài viết chờ duyệt", 500, pendingResult.error.message);
  }

  const rows = (pendingResult.data ?? []) as ModeratorEventRow[];
  const creatorIds = Array.from(
    new Set(rows.map((item) => item.created_by).filter((value): value is string => Boolean(value)))
  );

  if (creatorIds.length === 0) {
    return ok({ items: [] });
  }

  let roleMap = new Map<string, "user" | "moderator" | "admin">();
  try {
    roleMap = await loadLatestRoleByUserIds(creatorIds);
  } catch {
    roleMap = new Map<string, "user" | "moderator" | "admin">();
  }

  const moderatorRows = rows.filter((item) => {
    if (!item.created_by) {
      return false;
    }
    return roleMap.get(item.created_by) === "moderator";
  });

  if (moderatorRows.length === 0) {
    return ok({ items: [] });
  }

  const moderatorIds = Array.from(
    new Set(
      moderatorRows
        .map((item) => item.created_by)
        .filter((value): value is string => Boolean(value))
    )
  );
  const profileResult = await admin
    .from("profiles")
    .select("user_id,username,display_name")
    .in("user_id", moderatorIds);

  const profileMap = new Map<
    string,
    {
      username: string;
      displayName: string;
    }
  >();

  if (!profileResult.error) {
    (profileResult.data ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, {
        username: profile.username ?? "nguoi-dung",
        displayName: profile.display_name || profile.username || "Người dùng"
      });
    });
  }

  return ok({
    items: moderatorRows.map((item) => {
      const creatorId = item.created_by;
      const creatorProfile = creatorId ? profileMap.get(creatorId) : null;
      return {
        ...item,
        creator: creatorId
          ? {
              userId: creatorId,
              username: creatorProfile?.username ?? "nguoi-dung",
              displayName: creatorProfile?.displayName ?? "Người dùng",
              role: "moderator" as const
            }
          : null
      };
    })
  });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok || !access.userId) {
    return fail("Chỉ admin mới được duyệt bài của kiểm duyệt viên", access.status);
  }

  const parsed = await parseBody(request, moderatorEventReviewSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const eventResult = await admin
    .from("events")
    .select("id,title,slug,status,created_by")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (eventResult.error || !eventResult.data) {
    return fail("Không tìm thấy bài viết cần duyệt", 404);
  }
  if (eventResult.data.status !== "pending") {
    return fail("Bài viết này không còn ở trạng thái chờ duyệt", 400);
  }
  if (!eventResult.data.created_by) {
    return fail("Không xác định được người tạo bài viết", 400);
  }

  let roleMap = new Map<string, "user" | "moderator" | "admin">();
  try {
    roleMap = await loadLatestRoleByUserIds([eventResult.data.created_by]);
  } catch {
    roleMap = new Map<string, "user" | "moderator" | "admin">();
  }

  if (roleMap.get(eventResult.data.created_by) !== "moderator") {
    return fail("Bài viết này không thuộc luồng kiểm duyệt viên gửi duyệt", 400);
  }

  const nextStatus = parsed.data.action === "approve" ? "published" : "rejected";
  const updateResult = await admin
    .from("events")
    .update({
      status: nextStatus,
      updated_by: access.userId,
      updated_at: new Date().toISOString()
    })
    .eq("id", eventResult.data.id);

  if (updateResult.error) {
    return fail("Cập nhật trạng thái bài viết thất bại", 500, updateResult.error.message);
  }

  try {
    await pushNotificationToUser(admin, eventResult.data.created_by, {
      type: "submission_reviewed",
      title:
        parsed.data.action === "approve"
          ? "Bài viết của bạn đã được duyệt"
          : "Bài viết của bạn đã bị từ chối",
      body:
        parsed.data.action === "approve"
          ? "Bài viết do bạn gửi duyệt đã được admin duyệt và hiển thị công khai."
          : parsed.data.note?.trim()
            ? `Bài viết bị từ chối. Ghi chú từ admin: ${parsed.data.note.trim()}`
            : "Bài viết do bạn gửi duyệt đã bị admin từ chối.",
      link:
        parsed.data.action === "approve" && eventResult.data.slug
          ? `/su-kien/${eventResult.data.slug}`
          : "/thong-bao",
      metadata: {
        eventId: eventResult.data.id,
        action: parsed.data.action,
        source: "moderator_event_review"
      }
    });
  } catch {
    // Do not fail review flow when notification insertion fails.
  }

  return ok({
    reviewed: true,
    status: nextStatus
  });
}
