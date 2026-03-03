import Link from "next/link";
import { type ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";

const adminLinks = [
  { href: "/admin", label: "Tong quan" },
  { href: "/admin/su-kien", label: "Su kien" },
  { href: "/admin/tags", label: "Tag" },
  { href: "/admin/nguon", label: "Nguon" },
  { href: "/admin/kiem-duyet", label: "Kiem duyet" },
  { href: "/admin/nguoi-dung", label: "Nguoi dung" }
];

export function AdminShell({
  children,
  pathname
}: {
  children: ReactNode;
  pathname: string;
}) {
  return (
    <SiteShell>
      <section className="space-y-6">
        <header className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/80 p-4">
          {adminLinks.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                className={`rounded-xl px-3 py-2 text-sm ${
                  active
                    ? "bg-primary text-primary-fg"
                    : "border border-border bg-card text-fg/80"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </header>
        {children}
      </section>
    </SiteShell>
  );
}

