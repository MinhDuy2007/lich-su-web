"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  History,
  LogOut,
  Shield,
  Sparkles,
  UserCircle2,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/tim-kiem", label: "Tìm kiếm" },
  { href: "/dong-thoi-gian", label: "Dòng thời gian" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng" },
  { href: "/thu-vien", label: "Thư viện" },
  { href: "/gioi-thieu", label: "Giới thiệu" }
];

interface SiteHeaderProps {
  isAuthenticated: boolean;
  showAdmin: boolean;
}

interface LogoutPayload {
  success?: boolean;
  message?: string;
}

export function SiteHeader({ isAuthenticated, showAdmin }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname ?? "";
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });
      const payload = (await response.json().catch(() => ({}))) as LogoutPayload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Đăng xuất thất bại");
      }

      toast.success("Đã đăng xuất");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link className="group flex items-center gap-2" href="/">
          <span className="rounded-xl bg-primary/90 p-2 text-primary-fg shadow-lg shadow-primary/25 transition group-hover:scale-105">
            <History className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-fg sm:text-base">
            Tra Cứu <span className="text-primary">Lịch Sử</span>
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
                Đăng ký
              </Link>
              <Link
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
                href="/auth/dang-nhap"
              >
                <Sparkles className="h-4 w-4" />
                Đăng nhập
              </Link>
            </>
          ) : null}

          {isAuthenticated ? (
            <>
              <NotificationsBell />
              <Link
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
                href="/tai-khoan"
              >
                <UserCircle2 className="h-4 w-4" />
                Tài khoản
              </Link>
              <button
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg disabled:opacity-60 md:inline-flex md:items-center md:gap-2"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </>
          ) : null}

          {showAdmin ? (
            <Link
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg/80 transition hover:border-primary/40 hover:text-fg md:inline-flex md:items-center md:gap-2"
              href="/admin"
            >
              <Shield className="h-4 w-4" />
              Quản trị
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
