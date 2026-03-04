import { type ReactNode } from "react";
import { getUserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

interface SiteShellProps {
  children: ReactNode;
}

export async function SiteShell({ children }: SiteShellProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : null;

  return (
    <div className="min-h-screen">
      <SiteHeader isAuthenticated={Boolean(user)} showAdmin={role === "admin"} />
      <main className="mx-auto min-h-[calc(100vh-164px)] max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
