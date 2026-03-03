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
  const { error } = await admin.from("favorites").upsert(
    {
      user_id: user.id,
      event_id: id
    },
    {
      onConflict: "user_id,event_id"
    }
  );
  if (error) return fail("Khong the them yeu thich", 500, error.message);
  return ok({ favorited: true });
}

export async function DELETE(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Can dang nhap", 401);

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("event_id", id);
  if (error) return fail("Khong the bo yeu thich", 500, error.message);
  return ok({ favorited: false });
}

