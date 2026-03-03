import { type ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto min-h-[calc(100vh-164px)] max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

