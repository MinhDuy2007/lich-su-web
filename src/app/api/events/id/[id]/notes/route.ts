import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  content: z.string().trim().min(1).max(2000)
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Cần đăng nhập", 401);

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_notes")
    .select("id,content,updated_at")
    .eq("user_id", user.id)
    .eq("event_id", id)
    .maybeSingle();

  if (error) return fail("Không tải được ghi chú", 500, error.message);
  return ok({ note: data });
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Cần đăng nhập", 401);

  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return fail("Nội dung ghi chú không hợp lệ", 400);
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("event_notes").upsert(
    {
      user_id: user.id,
      event_id: id,
      content: parsed.data.content,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id,event_id"
    }
  );
  if (error) return fail("Không lưu được ghi chú", 500, error.message);

  return ok({ saved: true });
}

