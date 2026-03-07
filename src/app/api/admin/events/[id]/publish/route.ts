import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { pushNotificationToUser, pushNotificationToUsers } from "@/lib/notifications";

interface Params {
  params: Promise<{ id: string }>;
}

async function fetchStaffUserIds(admin: ReturnType<typeof createSupabaseAdmin>) {
  const rolesResult = await admin
    .from("user_roles")
    .select("user_id,role,created_at")
    .in("role", ["admin", "moderator"])
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

export async function POST(request: NextRequest, context: Params) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok || !access.userId) {
    return fail("Chỉ admin mới được xuất bản sự kiện", access.status);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const eventResult = await admin
    .from("events")
    .select("id,title,slug,status")
    .eq("id", id)
    .maybeSingle();

  if (eventResult.error) {
    return fail("Không tải được sự kiện cần xuất bản", 500, eventResult.error.message);
  }
  if (!eventResult.data) {
    return fail("Sự kiện không tồn tại", 404);
  }

  if (eventResult.data.status === "published") {
    return ok({ updated: false, alreadyPublished: true });
  }

  const updateResult = await admin
    .from("events")
    .update({
      status: "published",
      updated_by: access.userId,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (updateResult.error) {
    return fail("Xuất bản sự kiện thất bại", 500, updateResult.error.message);
  }

  try {
    const submissionResult = await admin
      .from("event_submissions")
      .select("submitted_by,id")
      .eq("approved_event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!submissionResult.error && submissionResult.data?.submitted_by) {
      await pushNotificationToUser(admin, submissionResult.data.submitted_by, {
        type: "submission_reviewed",
        title: "Bài viết đóng góp đã được xuất bản",
        body: "Đề xuất của bạn đã hoàn tất biên tập và được xuất bản công khai.",
        link: eventResult.data.slug ? `/su-kien/${eventResult.data.slug}` : "/thong-bao",
        metadata: {
          eventId: id,
          submissionId: submissionResult.data.id,
          action: "published"
        }
      });
    }
  } catch {
    // Do not fail publish flow when submitter notification insertion fails.
  }

  try {
    const staffIds = await fetchStaffUserIds(admin);
    const notifyIds = staffIds.filter((userId) => userId !== access.userId);
    if (notifyIds.length > 0) {
      await pushNotificationToUsers(admin, notifyIds, {
        type: "admin_broadcast",
        title: "Sự kiện đã được xuất bản",
        body: `Sự kiện "${eventResult.data.title}" đã được admin xuất bản.`,
        link: "/admin/su-kien",
        metadata: {
          eventId: id,
          slug: eventResult.data.slug
        }
      });
    }
  } catch {
    // Do not fail publish flow when staff notification insertion fails.
  }

  return ok({ updated: true });
}
