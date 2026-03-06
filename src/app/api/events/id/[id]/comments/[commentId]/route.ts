import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string; commentId: string }>;
}

function isMissingTableError(
  error: { code?: string | null; message?: string | null } | null,
  tableName: string
) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

async function getLatestRole(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const roleResult = await admin
    .from("user_roles")
    .select("role,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roleResult.error) {
    return "user" as const;
  }

  return (roleResult.data?.role as "user" | "moderator" | "admin" | undefined) ?? "user";
}

export async function DELETE(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const { id: eventId, commentId } = await context.params;
  const admin = createSupabaseAdmin();

  const commentResult = await admin
    .from("event_comments")
    .select("id,user_id,event_id")
    .eq("id", commentId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (commentResult.error) {
    if (isMissingTableError(commentResult.error, "event_comments")) {
      return fail("Tính năng bình luận chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không tải được bình luận", 500, commentResult.error.message);
  }

  if (!commentResult.data) {
    return fail("Không tìm thấy bình luận", 404);
  }

  const role = await getLatestRole(admin, user.id);
  const canDelete =
    commentResult.data.user_id === user.id || role === "admin" || role === "moderator";

  if (!canDelete) {
    return fail("Bạn không có quyền xóa bình luận này", 403);
  }

  const deleteResult = await admin
    .from("event_comments")
    .delete()
    .eq("id", commentId)
    .eq("event_id", eventId);

  if (deleteResult.error) {
    if (isMissingTableError(deleteResult.error, "event_comments")) {
      return fail("Tính năng bình luận chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Xóa bình luận thất bại", 500, deleteResult.error.message);
  }

  return ok({ deleted: true });
}
