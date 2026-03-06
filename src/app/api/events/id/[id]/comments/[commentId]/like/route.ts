import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { pushNotificationToUser } from "@/lib/notifications";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string; commentId: string }>;
}

function isMissingTableError(error: { code?: string | null; message?: string | null } | null, tableName: string) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập để thích bình luận", 401);
  }

  const { id: eventId, commentId } = await context.params;
  const admin = createSupabaseAdmin();

  const commentResult = await admin
    .from("event_comments")
    .select("id,event_id,user_id")
    .eq("id", commentId)
    .eq("event_id", eventId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (commentResult.error) {
    if (
      isMissingTableError(commentResult.error, "event_comments") ||
      isMissingTableError(commentResult.error, "event_comment_likes")
    ) {
      return fail("Tính năng bình luận chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không tải được bình luận", 500, commentResult.error.message);
  }
  if (!commentResult.data) {
    return fail("Bình luận không tồn tại", 404);
  }

  const existingLike = await admin
    .from("event_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLike.error) {
    if (isMissingTableError(existingLike.error, "event_comment_likes")) {
      return fail("Tính năng thích bình luận chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không cập nhật được lượt thích", 500, existingLike.error.message);
  }

  let isLiked = false;
  if (existingLike.data?.id) {
    const deleteResult = await admin
      .from("event_comment_likes")
      .delete()
      .eq("id", existingLike.data.id);

    if (deleteResult.error) {
      if (isMissingTableError(deleteResult.error, "event_comment_likes")) {
        return fail("Tính năng thích bình luận chưa sẵn sàng trên hệ thống", 503);
      }
      return fail("Không bỏ được lượt thích", 500, deleteResult.error.message);
    }
  } else {
    const insertResult = await admin.from("event_comment_likes").insert({
      comment_id: commentId,
      user_id: user.id
    });
    if (insertResult.error) {
      if (isMissingTableError(insertResult.error, "event_comment_likes")) {
        return fail("Tính năng thích bình luận chưa sẵn sàng trên hệ thống", 503);
      }
      return fail("Không thêm được lượt thích", 500, insertResult.error.message);
    }
    isLiked = true;

    if (commentResult.data.user_id !== user.id) {
      try {
        const { data: eventData } = await admin
          .from("events")
          .select("slug")
          .eq("id", eventId)
          .maybeSingle();

        await pushNotificationToUser(admin, commentResult.data.user_id, {
          type: "comment_like",
          title: "Bình luận của bạn có lượt thích mới",
          body: "Một người dùng vừa thích bình luận của bạn.",
          link: eventData?.slug ? `/su-kien/${eventData.slug}` : "/",
          metadata: {
            eventId,
            commentId
          }
        });
      } catch {
        // Do not fail like flow when notification insertion fails.
      }
    }
  }

  const countResult = await admin
    .from("event_comment_likes")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  if (countResult.error) {
    if (isMissingTableError(countResult.error, "event_comment_likes")) {
      return fail("Tính năng thích bình luận chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không tải được số lượt thích", 500, countResult.error.message);
  }

  return ok({
    isLiked,
    likeCount: countResult.count ?? 0
  });
}
