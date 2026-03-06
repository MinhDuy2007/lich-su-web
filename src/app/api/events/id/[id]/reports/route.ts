import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest, getUserRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { eventReportCreateSchema } from "@/lib/validation";
import { parseBody } from "@/lib/parse-body";
import { pushNotificationToUsers } from "@/lib/notifications";

interface Params {
  params: Promise<{ id: string }>;
}

function isMissingTableError(error: { code?: string | null; message?: string | null } | null, tableName: string) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập để gửi báo cáo", 401);
  }

  const parsed = await parseBody(request, eventReportCreateSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Nội dung báo cáo không hợp lệ", 400);
  }

  const { id: eventId } = await context.params;
  const admin = createSupabaseAdmin();
  const insertResult = await admin
    .from("event_reports")
    .insert({
      event_id: eventId,
      reporter_user_id: user.id,
      reason: parsed.data.reason,
      detail: parsed.data.detail ?? null,
      status: "pending"
    })
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data) {
    if (isMissingTableError(insertResult.error, "event_reports")) {
      return fail("Tính năng báo cáo chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không gửi được báo cáo", 500, insertResult.error?.message);
  }

  try {
    const { data: profiles } = await admin.from("profiles").select("user_id");
    const userIds = (profiles ?? []).map((row) => row.user_id);
    const roleMap = new Map<string, "user" | "moderator" | "admin">();

    if (userIds.length > 0) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id,role,created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      (roleRows ?? []).forEach((row) => {
        if (!roleMap.has(row.user_id)) {
          roleMap.set(row.user_id, row.role as "user" | "moderator" | "admin");
        }
      });
    }

    const staffIds = userIds.filter((userId) => {
      const role = roleMap.get(userId) ?? "user";
      return role === "admin" || role === "moderator";
    });

    if (staffIds.length > 0) {
      await pushNotificationToUsers(admin, staffIds, {
        type: "admin_broadcast",
        title: "Có báo cáo bài viết mới",
        body: "Một người dùng vừa gửi báo cáo bài viết, vui lòng kiểm tra.",
        link: "/admin/thong-bao",
        metadata: {
          reportId: insertResult.data.id,
          eventId
        }
      });
    }
  } catch {
    // Do not fail report flow when staff notification insertion fails.
  }

  return ok({ reportId: insertResult.data.id }, 201);
}

export async function GET(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const role = await getUserRole(user.id);
  if (role !== "admin" && role !== "moderator") {
    return fail("Không đủ quyền truy cập", 403);
  }

  const { id: eventId } = await context.params;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_reports")
    .select("id,reason,detail,status,admin_response,reviewed_at,created_at,reporter_user_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingTableError(error, "event_reports")) {
      return ok({ items: [] });
    }
    return fail("Không tải được báo cáo", 500, error.message);
  }

  return ok({ items: data ?? [] });
}
