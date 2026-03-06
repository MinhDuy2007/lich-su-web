import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { notificationsMarkReadSchema } from "@/lib/validation";
import {
  markAllNotificationsRead,
  markNotificationsReadByIds
} from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const parsed = await parseBody(request, notificationsMarkReadSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Dữ liệu không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  try {
    if (parsed.data.markAll) {
      await markAllNotificationsRead(admin, user.id);
    } else {
      await markNotificationsReadByIds(admin, user.id, parsed.data.ids ?? []);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("notifications") || error.message.includes("42P01"))
    ) {
      return fail("Tính năng thông báo chưa sẵn sàng trên hệ thống", 503);
    }
    return fail(
      "Không cập nhật được trạng thái thông báo",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }

  return ok({ updated: true });
}
