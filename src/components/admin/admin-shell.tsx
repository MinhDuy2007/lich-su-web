import Link from "next/link";
import { type ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/su-kien", label: "Sự kiện" },
  { href: "/admin/tags", label: "Thẻ" },
  { href: "/admin/nguon", label: "Nguồn" },
  { href: "/admin/kiem-duyet", label: "Kiểm duyệt" },
  { href: "/admin/nguoi-dung", label: "Người dùng" },
  { href: "/admin/thong-bao", label: "Thông báo" }
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
