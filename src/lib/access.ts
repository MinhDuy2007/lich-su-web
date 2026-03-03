import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRoleByUserId } from "@/lib/profile";

export async function requireLoggedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/dang-nhap");
  }
  return user;
}

export async function requireAdminOrModerator() {
  const user = await requireLoggedUser();
  const role = await getUserRoleByUserId(user.id);
  if (role !== "admin" && role !== "moderator") {
    redirect("/");
  }
  return { user, role };
}

export async function requireAdminOnly() {
  const user = await requireLoggedUser();
  const role = await getUserRoleByUserId(user.id);
  if (role !== "admin") {
    redirect("/admin");
  }
  return { user, role };
}

