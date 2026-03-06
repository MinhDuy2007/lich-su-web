import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

function isMissingTableError(error: { code?: string | null; message?: string | null } | null, tableName: string) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

export async function GET(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_follows")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "event_follows")) {
      return ok({ isFollowing: false });
    }
    return fail("Không kiểm tra được trạng thái theo dõi", 500, error.message);
  }

  return ok({ isFollowing: Boolean(data?.id) });
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("event_follows").upsert(
    {
      user_id: user.id,
      event_id: id
    },
    {
      onConflict: "user_id,event_id"
    }
  );

  if (error) {
    if (isMissingTableError(error, "event_follows")) {
      return fail("Tính năng theo dõi chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không theo dõi được bài viết", 500, error.message);
  }

  return ok({ isFollowing: true });
}

export async function DELETE(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("event_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("event_id", id);

  if (error) {
    if (isMissingTableError(error, "event_follows")) {
      return fail("Tính năng theo dõi chưa sẵn sàng trên hệ thống", 503);
    }
    return fail("Không bỏ theo dõi được bài viết", 500, error.message);
  }

  return ok({ isFollowing: false });
}
