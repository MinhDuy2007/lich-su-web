import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { userBanSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin"]);
  if (!access.ok) {
    return fail("Chi admin moi duoc khoa tai khoan", access.status);
  }

  const parsed = await parseBody(request, userBanSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({
      is_banned: parsed.data.isBanned
    })
    .eq("user_id", parsed.data.userId);
  if (error) {
    return fail("Cap nhat trang thai tai khoan that bai", 500, error.message);
  }

  return ok({ updated: true });
}

