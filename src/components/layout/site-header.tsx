"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Shield, Sparkles, UserCircle2, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Trang chu" },
  { href: "/tim-kiem", label: "Tim kiem" },
  { href: "/dong-thoi-gian", label: "Dong thoi gian" },
  { href: "/bang-xep-hang", label: "Bang xep hang" },
  { href: "/thu-vien", label: "Thu vien" },
  { href: "/gioi-thieu", label: "Gioi thieu" }
];

interface SiteHeaderProps {
  isAuthenticated: boolean;
  showAdmin: boolean;
}

export function SiteHeader({ isAuthenticated, showAdmin }: SiteHeaderProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link className="group flex items-center gap-2" href="/">
          <span className="rounded-xl bg-primary/90 p-2 text-primary-fg shadow-lg shadow-primary/25 transition group-hover:scale-105">
            <History className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-fg sm:text-base">
            LichSu<span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active =
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href));
            return (
              <Link
                className={cn(
                  "rounded-xl px-3 py-2 text-sm transition",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-fg/75 hover:bg-muted hover:text-fg"
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <Link
                className="hidden rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
                href="/auth/dang-ky"
              >
                <UserPlus className="h-4 w-4" />
                Dang ky
              </Link>
              <Link
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
                href="/auth/dang-nhap"
              >
                <Sparkles className="h-4 w-4" />
                Dang nhap
              </Link>
            </>
          ) : null}
          {isAuthenticated ? (
            <Link
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
              href="/tai-khoan"
            >
              <UserCircle2 className="h-4 w-4" />
              Tai khoan
            </Link>
          ) : null}
          {showAdmin ? (
            <Link
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
              href="/admin"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
