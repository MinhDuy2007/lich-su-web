"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function statusLabel(value: unknown) {
  switch (value) {
    case "reviewing":
      return "Đang xử lý";
    case "resolved":
      return "Đã xử lý";
    case "rejected":
      return "Từ chối báo cáo";
    default:
      return "Đã phản hồi";
  }
}

function readMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function NotificationsPageClient() {
  const searchParams = useSearchParams();
  const selectedFromQuery = searchParams?.get("id") ?? null;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(selectedFromQuery);

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không tải được thông báo");
      }

      const nextItems = (payload.data.items ?? []) as NotificationItem[];
      setItems(nextItems);

      if (selectedFromQuery && nextItems.some((item) => item.id === selectedFromQuery)) {
        setSelectedId(selectedFromQuery);
      } else {
        setSelectedId((prev) => prev ?? nextItems[0]?.id ?? null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedFromQuery) {
      setSelectedId(selectedFromQuery);
    }
  }, [selectedFromQuery]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );

  async function markAsRead(ids: string[], markAll = false) {
    if (ids.length === 0 && !markAll) return;

    setMarking(true);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(markAll ? { markAll: true } : { ids })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được thông báo");
      }

      if (markAll) {
        setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      } else {
        const idSet = new Set(ids);
        setItems((prev) =>
          prev.map((item) => (idSet.has(item.id) ? { ...item, is_read: true } : item))
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setMarking(false);
    }
  }

  async function handleSelect(item: NotificationItem) {
    setSelectedId(item.id);
    if (!item.is_read) {
      await markAsRead([item.id], false);
    }
  }

  const isReportResponse = selected?.type === "report_response";
  const reportEventTitle = selected ? readMetadataText(selected.metadata, "eventTitle") : null;
  const reportAdminResponse = selected ? readMetadataText(selected.metadata, "adminResponse") : null;
  const reportChangesApplied = selected ? readMetadataText(selected.metadata, "changesApplied") : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Thông báo của bạn</h1>
          <p className="mt-1 text-sm text-fg/70">
            Mở từng mục để xem nội dung đầy đủ và phản hồi liên quan.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-fg/80 transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
          disabled={marking || items.length === 0}
          onClick={() => void markAsRead([], true)}
          type="button"
        >
          <CheckCheck className="h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="card-glass rounded-2xl p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg/70">
            Danh sách
          </h2>
          {loading ? <p className="text-sm text-fg/65">Đang tải thông báo...</p> : null}
          {!loading && items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-3 text-sm text-fg/70">
              Chưa có thông báo mới.
            </p>
          ) : null}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selected?.id === item.id
                      ? "border-primary/45 bg-primary/10"
                      : item.is_read
                        ? "border-border bg-card hover:border-primary/30"
                        : "border-primary/40 bg-primary/5 hover:border-primary/60"
                  )}
                  onClick={() => void handleSelect(item)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-fg">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fg/70">{item.body}</p>
                  <p className="mt-2 text-[11px] text-fg/50">{formatDateLabel(item.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-glass rounded-2xl p-5">
          {!selected ? (
            <p className="text-sm text-fg/70">Chọn một thông báo để xem chi tiết.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-fg/60">
                {selected.is_read ? "Đã đọc" : "Chưa đọc"}
              </p>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              <p className="text-xs text-fg/60">{formatDateLabel(selected.created_at)}</p>

              {isReportResponse ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 text-sm leading-7 text-fg/85">
                    {selected.body}
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                      Tình trạng xử lý
                    </p>
                    <p className="mt-2 text-sm font-semibold text-fg">
                      {statusLabel(selected.metadata.status)}
                    </p>
                    {reportEventTitle ? (
                      <p className="mt-2 text-sm text-fg/75">Bài viết liên quan: {reportEventTitle}</p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">
                      Thay đổi đã thực hiện
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                      {reportChangesApplied ?? "Hiện chưa có ghi chú thay đổi cụ thể."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">
                      Phản hồi của admin
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                      {reportAdminResponse ?? "Hiện chưa có phản hồi chi tiết."}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-card p-4 text-sm leading-7 text-fg/85">
                    {selected.body}
                  </div>
                  {selected.link ? (
                    <Link
                      className="inline-flex rounded-xl border border-border bg-bg px-4 py-2 text-sm font-semibold text-fg/80 transition hover:border-primary/40 hover:text-primary"
                      href={selected.link}
                    >
                      Mở trang liên quan
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
