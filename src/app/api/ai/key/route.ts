import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { encryptText } from "@/lib/crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  apiKey: z.string().min(20)
});

export async function POST(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Can dang nhap", 401);
  }

  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return fail("API key khong hop le", 400);
  }

  const encrypted = encryptText(parsed.data.apiKey.trim());
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({ gemini_api_key_encrypted: encrypted })
    .eq("user_id", user.id);

  if (error) {
    return fail("Khong luu duoc API key", 500, error.message);
  }

  return ok({ saved: true });
}

export async function DELETE(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Can dang nhap", 401);
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({ gemini_api_key_encrypted: null })
    .eq("user_id", user.id);

  if (error) {
    return fail("Khong xoa duoc API key", 500, error.message);
  }
  return ok({ removed: true });
}

