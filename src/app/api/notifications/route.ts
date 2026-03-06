import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function isMissingTableError(error: { code?: string | null; message?: string | null } | null, tableName: string) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return (error.message ?? "").includes(tableName);
}

export async function GET(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Bạn cần đăng nhập", 401);
  }

  const admin = createSupabaseAdmin();
  const [itemsResult, unreadResult] = await Promise.all([
    admin
      .from("notifications")
      .select("id,type,title,body,link,metadata,is_read,created_at,read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
  ]);

  if (itemsResult.error) {
    if (isMissingTableError(itemsResult.error, "notifications")) {
      return ok({
        items: [],
        unreadCount: 0
      });
    }
    return fail("Không tải được thông báo", 500, itemsResult.error.message);
  }
  if (unreadResult.error) {
    if (isMissingTableError(unreadResult.error, "notifications")) {
      return ok({
        items: [],
        unreadCount: 0
      });
    }
    return fail("Không tải được số thông báo chưa đọc", 500, unreadResult.error.message);
  }

  return ok({
    items: itemsResult.data ?? [],
    unreadCount: unreadResult.count ?? 0
  });
}
