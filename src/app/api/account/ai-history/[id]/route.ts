import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Can dang nhap", 401);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const result = await admin
    .from("ai_messages")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (result.error) {
    return fail("Khong xoa duoc ban ghi lich su", 500, result.error.message);
  }

  return ok({ removed: true });
}
