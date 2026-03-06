import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { parseBody } from "@/lib/parse-body";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { commentCreateSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

interface CommentRow {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
}

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface RoleRow {
  user_id: string;
  role: "user" | "moderator" | "admin";
}

function isMissingTableError(
  error: { code?: string | null; message?: string | null } | null,
  tableName: string
) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

function isMissingParentColumnError(
  error: { code?: string | null; message?: string | null } | null
) {
  if (!error) return false;
  if (error.code !== "42703") return false;
  return (error.message ?? "").includes("parent_comment_id");
}

function roleLabel(role: "user" | "moderator" | "admin") {
  if (role === "admin") return "admin";
  if (role === "moderator") return "mod";
  return "member";
}

async function resolveCurrentRole(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string | null
) {
  if (!userId) {
    return null;
  }

  const roleResult = await admin
    .from("user_roles")
    .select("role,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roleResult.error) {
    return null;
  }

  return (roleResult.data?.role as "user" | "moderator" | "admin" | undefined) ?? "user";
}

async function loadCommentViewData(
  admin: ReturnType<typeof createSupabaseAdmin>,
  commentRows: CommentRow[],
  currentUserId: string | null,
  currentUserRole: "user" | "moderator" | "admin" | null
) {
  const userIds = Array.from(new Set(commentRows.map((row) => row.user_id)));
  const commentIds = commentRows.map((row) => row.id);

  const [profilesResult, rolesResult, likesResult, myLikesResult] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin
          .from("profiles")
          .select("user_id,username,display_name,avatar_url")
          .in("user_id", userIds),
    userIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin
          .from("user_roles")
          .select("user_id,role,created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false }),
    commentIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : admin.from("event_comment_likes").select("comment_id").in("comment_id", commentIds),
    currentUserId && commentIds.length > 0
      ? admin
          .from("event_comment_likes")
          .select("comment_id")
          .eq("user_id", currentUserId)
          .in("comment_id", commentIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }
  if (likesResult.error && !isMissingTableError(likesResult.error, "event_comment_likes")) {
    throw new Error(likesResult.error.message);
  }
  if (myLikesResult.error && !isMissingTableError(myLikesResult.error, "event_comment_likes")) {
    throw new Error(myLikesResult.error.message);
  }

  const profileMap = new Map<string, ProfileRow>();
  (profilesResult.data as ProfileRow[]).forEach((row) => {
    profileMap.set(row.user_id, row);
  });

  const roleMap = new Map<string, "user" | "moderator" | "admin">();
  (rolesResult.data as RoleRow[]).forEach((row) => {
    if (!roleMap.has(row.user_id)) {
      roleMap.set(row.user_id, row.role);
    }
  });

  const likeCountMap = new Map<string, number>();
  (likesResult.data ?? []).forEach((row) => {
    const commentId = row.comment_id as string;
    likeCountMap.set(commentId, (likeCountMap.get(commentId) ?? 0) + 1);
  });

  const myLikeSet = new Set(
    (myLikesResult.data ?? [])
      .map((row) => row.comment_id as string)
      .filter((value) => value.length > 0)
  );

  return commentRows.map((row) => {
    const profile = profileMap.get(row.user_id);
    const role = roleMap.get(row.user_id) ?? "user";
    const canDelete = Boolean(
      currentUserId &&
        (currentUserId === row.user_id ||
          currentUserRole === "admin" ||
          currentUserRole === "moderator")
    );

    return {
      id: row.id,
      eventId: row.event_id,
      parentId: row.parent_comment_id ?? null,
      content: row.content,
      createdAt: row.created_at,
      likeCount: likeCountMap.get(row.id) ?? 0,
      isLiked: myLikeSet.has(row.id),
      canDelete,
      author: {
        userId: row.user_id,
        username: profile?.username ?? "nguoi-dung",
        displayName: profile?.display_name || profile?.username || "Người dùng",
        avatarUrl: profile?.avatar_url ?? null,
        role,
        roleLabel: roleLabel(role)
      }
    };
  });
}

export async function GET(request: NextRequest, context: Params) {
  const { id } = await context.params;
  const { user } = await getAuthUserFromRequest(request);
  const admin = createSupabaseAdmin();

  let commentsResult: {
    data: CommentRow[] | null;
    error: { code?: string | null; message?: string | null } | null;
  } = {
    data: null,
    error: null
  };

  const withParentResult = await admin
    .from("event_comments")
    .select("id,event_id,user_id,content,created_at,parent_comment_id")
    .eq("event_id", id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(300);

  commentsResult = {
    data: (withParentResult.data as CommentRow[] | null) ?? null,
    error: withParentResult.error
  };

  if (isMissingParentColumnError(commentsResult.error)) {
    const fallbackResult = await admin
      .from("event_comments")
      .select("id,event_id,user_id,content,created_at")
      .eq("event_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(300);
    commentsResult = {
      data: (fallbackResult.data as CommentRow[] | null) ?? null,
      error: fallbackResult.error
    };
  }

  if (commentsResult.error) {
    if (isMissingTableError(commentsResult.error, "event_comments")) {
      return ok({ items: [] });
    }
    return fail("Không tải được bình luận", 500, commentsResult.error.message);
  }

  try {
    const currentRole = await resolveCurrentRole(admin, user?.id ?? null);
    const items = await loadCommentViewData(
      admin,
      (commentsResult.data ?? []) as CommentRow[],
      user?.id ?? null,
      currentRole
    );
    return ok({ items });
  } catch (error) {
    return fail(
      "Không tải được dữ liệu bình luận",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập để bình luận", 401);
  }

  const { id } = await context.params;
  const parsed = await parseBody(request, commentCreateSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Nội dung không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();

  if (parsed.data.parentId) {
    const parentComment = await admin
      .from("event_comments")
      .select("id")
      .eq("id", parsed.data.parentId)
      .eq("event_id", id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (parentComment.error) {
      if (isMissingTableError(parentComment.error, "event_comments")) {
        return fail("Tính năng bình luận chưa sẵn sàng trên hệ thống", 503);
      }
      return fail("Không kiểm tra được bình luận gốc", 500, parentComment.error.message);
    }

    if (!parentComment.data) {
      return fail("Không tìm thấy bình luận gốc để phản hồi", 404);
    }
  }

  let insertResult: {
    data: CommentRow | null;
    error: { code?: string | null; message?: string | null } | null;
  } = {
    data: null,
    error: null
  };

  const insertWithParentResult = await admin
    .from("event_comments")
    .insert({
      event_id: id,
      user_id: user.id,
      content: parsed.data.content,
      parent_comment_id: parsed.data.parentId ?? null
    })
    .select("id,event_id,user_id,content,created_at,parent_comment_id")
    .single();

  insertResult = {
    data: (insertWithParentResult.data as CommentRow | null) ?? null,
    error: insertWithParentResult.error
  };

  if (isMissingParentColumnError(insertResult.error)) {
    if (parsed.data.parentId) {
      return fail("Hệ thống chưa bật phản hồi bình luận. Vui lòng thử lại sau", 503);
    }

    const insertFallbackResult = await admin
      .from("event_comments")
      .insert({
        event_id: id,
        user_id: user.id,
        content: parsed.data.content
      })
      .select("id,event_id,user_id,content,created_at")
      .single();

    insertResult = {
      data: (insertFallbackResult.data as CommentRow | null) ?? null,
      error: insertFallbackResult.error
    };
  }

  if (insertResult.error || !insertResult.data) {
    if (isMissingTableError(insertResult.error, "event_comments")) {
      return fail("Tính năng bình luận chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không thêm được bình luận", 500, insertResult.error?.message);
  }

  try {
    const currentRole = await resolveCurrentRole(admin, user.id);
    const items = await loadCommentViewData(
      admin,
      [insertResult.data as CommentRow],
      user.id,
      currentRole
    );
    return ok({ item: items[0] }, 201);
  } catch (error) {
    return fail(
      "Không tải được bình luận vừa thêm",
      500,
      error instanceof Error ? error.message : "Lỗi hệ thống"
    );
  }
}
