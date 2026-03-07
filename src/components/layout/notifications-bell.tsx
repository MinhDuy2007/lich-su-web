"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không tải được thông báo");
      }

      setItems(payload.data.items ?? []);
      setUnreadCount(Number(payload.data.unreadCount ?? 0));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllAsRead() {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được thông báo");
      }

      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    }
  }

  async function markOneAsRead(item: NotificationItem) {
    if (item.is_read) return;

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được thông báo");
      }

      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, is_read: true } : row))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Không chặn điều hướng nếu đánh dấu đã đọc lỗi.
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-fg/80 transition hover:border-primary/40 hover:text-primary"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[350px] rounded-2xl border border-border bg-bg p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Thông báo</p>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-fg/70 transition hover:border-primary/35 hover:text-primary"
              onClick={() => void markAllAsRead()}
              type="button"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đánh dấu đã đọc
            </button>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {loading ? <p className="text-xs text-fg/60">Đang tải...</p> : null}
            {!loading && items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-fg/60">
                Chưa có thông báo mới.
              </p>
            ) : null}

            {items.map((item) => {
              const detailHref =
                item.type === "support_request"
                  ? item.link ?? "/admin/thong-bao"
                  : `/thong-bao?id=${item.id}`;
              return (
                <Link
                  className={cn(
                    "block rounded-xl border p-3 transition",
                    item.is_read
                      ? "border-border bg-card hover:border-primary/30"
                      : "border-primary/35 bg-primary/5 hover:border-primary/60"
                  )}
                  href={detailHref}
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    void markOneAsRead(item);
                  }}
                >
                  <p className="text-xs font-semibold text-fg">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fg/70">{item.body}</p>
                  <p className="mt-2 text-[11px] text-fg/50">
                    {formatNotificationTime(item.created_at)}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 border-t border-border pt-3 text-right">
            <Link
              className="text-xs font-semibold text-primary underline"
              href="/thong-bao"
              onClick={() => setOpen(false)}
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
