import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Can dang nhap", 401);

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("view_history").insert({
    user_id: user.id,
    event_id: id,
    viewed_at: new Date().toISOString()
  });
  if (error) {
    return fail("Khong luu duoc lich su", 500, error.message);
  }
  return ok({ tracked: true });
}

