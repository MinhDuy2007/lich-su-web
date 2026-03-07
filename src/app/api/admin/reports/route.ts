import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { pushNotificationToUser } from "@/lib/notifications";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { reportReviewSchema } from "@/lib/validation";
import { isMissingColumnError } from "@/lib/db-compat";

function isMissingTableError(
  error: { code?: string | null; message?: string | null } | null,
  tableName: string
) {
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
  let reportsResult: {
    data: Array<Record<string, unknown>> | null;
    error: { code?: string | null; message?: string | null } | null;
  } = await admin
    .from("event_reports")
    .select(
      "id,event_id,reporter_user_id,reason,detail,status,admin_response,changes_applied,reviewed_by,reviewed_at,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (isMissingColumnError(reportsResult.error, ["changes_applied"])) {
    reportsResult = await admin
      .from("event_reports")
      .select("id,event_id,reporter_user_id,reason,detail,status,admin_response,reviewed_by,reviewed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
  }

  if (reportsResult.error) {
    if (isMissingTableError(reportsResult.error, "event_reports")) {
      return ok({ items: [] });
    }
    return fail("KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch bÃ¡o cÃ¡o", 500, reportsResult.error.message);
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
    return fail("KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u sá»± kiá»‡n", 500, eventsResult.error.message);
  }
  if (profilesResult.error) {
    return fail(
      "KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u ngÆ°á»i gá»­i bÃ¡o cÃ¡o",
      500,
      profilesResult.error.message
    );
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
    id: String(report.id ?? ""),
    reason: String(report.reason ?? ""),
    detail: typeof report.detail === "string" ? report.detail : null,
    status: report.status,
    adminResponse: typeof report.admin_response === "string" ? report.admin_response : null,
    changesApplied:
      typeof report.changes_applied === "string" ? report.changes_applied : null,
    reviewedAt: typeof report.reviewed_at === "string" ? report.reviewed_at : null,
    createdAt: String(report.created_at ?? ""),
    event: {
      id: String(report.event_id ?? ""),
      title: eventMap.get(String(report.event_id ?? ""))?.title ?? "Sá»± kiá»‡n Ä‘Ã£ xÃ³a",
      slug: eventMap.get(String(report.event_id ?? ""))?.slug ?? ""
    },
    reporter: {
      userId: String(report.reporter_user_id ?? ""),
      username:
        profileMap.get(String(report.reporter_user_id ?? ""))?.username ?? "nguoi-dung",
      displayName:
        profileMap.get(String(report.reporter_user_id ?? ""))?.displayName ?? "NgÆ°á»i dÃ¹ng"
    }
  }));

  return ok({ items });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok || !access.userId) {
    return fail("Chỉ admin mới được phản hồi báo cáo", access.status);
  }

  const parsed = await parseBody(request, reportReviewSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khÃ´ng há»£p lá»‡", 400);
  }

  const admin = createSupabaseAdmin();
  const { data: report, error: reportError } = await admin
    .from("event_reports")
    .select("id,event_id,reporter_user_id")
    .eq("id", parsed.data.reportId)
    .maybeSingle();

  if (reportError) {
    if (isMissingTableError(reportError, "event_reports")) {
      return fail("TÃ­nh nÄƒng bÃ¡o cÃ¡o chÆ°a sáºµn sÃ ng trÃªn há»‡ thá»‘ng", 503);
    }
    return fail("KhÃ´ng táº£i Ä‘Æ°á»£c bÃ¡o cÃ¡o", 500, reportError.message);
  }
  if (!report) {
    return fail("KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o", 404);
  }

  const changesApplied = parsed.data.changesApplied?.trim() || null;

  let updateError =
    (
      await admin
        .from("event_reports")
        .update({
          status: parsed.data.status,
          admin_response: parsed.data.response,
          changes_applied: changesApplied,
          reviewed_by: access.userId,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", parsed.data.reportId)
    ).error ?? null;

  if (isMissingColumnError(updateError, ["changes_applied"])) {
    updateError =
      (
        await admin
          .from("event_reports")
          .update({
            status: parsed.data.status,
            admin_response: parsed.data.response,
            reviewed_by: access.userId,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", parsed.data.reportId)
      ).error ?? null;
  }

  if (updateError) {
    if (isMissingTableError(updateError, "event_reports")) {
      return fail("TÃ­nh nÄƒng bÃ¡o cÃ¡o chÆ°a sáºµn sÃ ng trÃªn há»‡ thá»‘ng", 503);
    }
    return fail("KhÃ´ng pháº£n há»“i Ä‘Æ°á»£c bÃ¡o cÃ¡o", 500, updateError.message);
  }

  try {
    const { data: eventData } = await admin
      .from("events")
      .select("title")
      .eq("id", report.event_id)
      .maybeSingle();

    await pushNotificationToUser(admin, report.reporter_user_id, {
      type: "report_response",
      title: "BÃ¡o cÃ¡o cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c pháº£n há»“i",
      body: "Quáº£n trá»‹ viÃªn Ä‘Ã£ xem vÃ  pháº£n há»“i bÃ¡o cÃ¡o cá»§a báº¡n. Má»Ÿ thÃ´ng bÃ¡o Ä‘á»ƒ xem chi tiáº¿t.",
      link: null,
      metadata: {
        reportId: parsed.data.reportId,
        eventId: report.event_id,
        eventTitle: eventData?.title ?? null,
        status: parsed.data.status,
        adminResponse: parsed.data.response,
        changesApplied
      }
    });
  } catch {
    // Do not fail report review when notification insertion fails.
  }

  return ok({ reviewed: true });
}

