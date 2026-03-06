import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { pushNotificationToUser } from "@/lib/notifications";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { reportReviewSchema } from "@/lib/validation";

function isMissingTableError(error: { code?: string | null; message?: string | null } | null, tableName: string) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const admin = createSupabaseAdmin();
  const reportsResult = await admin
    .from("event_reports")
    .select(
      "id,event_id,reporter_user_id,reason,detail,status,admin_response,reviewed_by,reviewed_at,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (reportsResult.error) {
    if (isMissingTableError(reportsResult.error, "event_reports")) {
      return ok({ items: [] });
    }
    return fail("Không tải được danh sách báo cáo", 500, reportsResult.error.message);
  }

  const reports = reportsResult.data ?? [];
  const eventIds = Array.from(new Set(reports.map((item) => item.event_id)));
  const reporterIds = Array.from(new Set(reports.map((item) => item.reporter_user_id)));

  const [eventsResult, profilesResult] = await Promise.all([
    eventIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin.from("events").select("id,title,slug").in("id", eventIds),
    reporterIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin
          .from("profiles")
          .select("user_id,username,display_name")
          .in("user_id", reporterIds)
  ]);

  if (eventsResult.error) {
    return fail("Không tải được dữ liệu sự kiện", 500, eventsResult.error.message);
  }
  if (profilesResult.error) {
    return fail("Không tải được dữ liệu người gửi báo cáo", 500, profilesResult.error.message);
  }

  const eventMap = new Map(
    (eventsResult.data ?? []).map((event) => [event.id, { title: event.title, slug: event.slug }])
  );
  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.user_id,
      {
        username: profile.username,
        displayName: profile.display_name || profile.username
      }
    ])
  );

  const items = reports.map((report) => ({
    id: report.id,
    reason: report.reason,
    detail: report.detail,
    status: report.status,
    adminResponse: report.admin_response,
    reviewedAt: report.reviewed_at,
    createdAt: report.created_at,
    event: {
      id: report.event_id,
      title: eventMap.get(report.event_id)?.title ?? "Sự kiện đã xóa",
      slug: eventMap.get(report.event_id)?.slug ?? ""
    },
    reporter: {
      userId: report.reporter_user_id,
      username: profileMap.get(report.reporter_user_id)?.username ?? "nguoi-dung",
      displayName:
        profileMap.get(report.reporter_user_id)?.displayName ?? "Người dùng"
    }
  }));

  return ok({ items });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Không đủ quyền", access.status);
  }

  const parsed = await parseBody(request, reportReviewSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const { data: report, error: reportError } = await admin
    .from("event_reports")
    .select("id,event_id,reporter_user_id")
    .eq("id", parsed.data.reportId)
    .maybeSingle();

  if (reportError) {
    if (isMissingTableError(reportError, "event_reports")) {
      return fail("Tính năng báo cáo chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không tải được báo cáo", 500, reportError.message);
  }
  if (!report) {
    return fail("Không tìm thấy báo cáo", 404);
  }

  const { error: updateError } = await admin
    .from("event_reports")
    .update({
      status: parsed.data.status,
      admin_response: parsed.data.response,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", parsed.data.reportId);

  if (updateError) {
    if (isMissingTableError(updateError, "event_reports")) {
      return fail("Tính năng báo cáo chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không phản hồi được báo cáo", 500, updateError.message);
  }

  try {
    const { data: eventData } = await admin
      .from("events")
      .select("slug")
      .eq("id", report.event_id)
      .maybeSingle();
    await pushNotificationToUser(admin, report.reporter_user_id, {
      type: "report_response",
      title: "Báo cáo của bạn đã được phản hồi",
      body: "Quản trị viên đã phản hồi báo cáo của bạn. Mở thông báo để xem chi tiết.",
      link: eventData?.slug ? `/su-kien/${eventData.slug}` : "/tai-khoan",
      metadata: {
        reportId: parsed.data.reportId,
        status: parsed.data.status
      }
    });
  } catch {
    // Do not fail report review when notification insertion fails.
  }

  return ok({ reviewed: true });
}
