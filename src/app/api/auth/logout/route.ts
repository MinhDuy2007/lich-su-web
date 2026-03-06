import { fail, ok } from "@/lib/api-response";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST() {
  const supabase = await createSupabaseRouteClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return fail("Đăng xuất thất bại", 500, error.message);
  }

  return ok({ signedOut: true });
}
