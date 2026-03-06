import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { pushNotificationToUsers } from "@/lib/notifications";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { adminBroadcastSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chỉ admin mới được gửi thông báo hệ thống", access.status);
  }

  const parsed = await parseBody(request, adminBroadcastSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Nội dung thông báo không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const usersResult = await admin.from("profiles").select("user_id");
  if (usersResult.error) {
    return fail("Không tải được danh sách người nhận", 500, usersResult.error.message);
  }

  const userIds = (usersResult.data ?? [])
    .map((row) => row.user_id)
    .filter((value): value is string => value.length > 0);

  if (userIds.length === 0) {
    return fail("Không có tài khoản nhận thông báo", 400);
  }

  try {
    const result = await pushNotificationToUsers(admin, userIds, {
      type: "admin_broadcast",
      title: parsed.data.title,
      body: parsed.data.body,
      link: parsed.data.link ?? null
    });

    return ok({ sent: result.inserted });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("notifications") || error.message.includes("42P01"))
    ) {
      return fail("Tính năng thông báo chưa sẵn sàng trên hệ thống", 503);
    }
    return fail(
      "Gửi thông báo toàn hệ thống thất bại",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }
}
