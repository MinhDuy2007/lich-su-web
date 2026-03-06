"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface BookmarkItem {
  id: string;
  eventId: string;
  slug: string;
  title: string;
  summary: string;
  createdAt: string;
}

interface BookmarkListProps {
  items: BookmarkItem[];
}

export function BookmarkList({ items }: BookmarkListProps) {
  const [rows, setRows] = useState(items);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeBookmark(eventId: string) {
    setRemovingId(eventId);
    try {
      const response = await fetch(`/api/events/id/${eventId}/favorite`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không bỏ được bookmark");
      }
      setRows((prev) => prev.filter((row) => row.eventId !== eventId));
      toast.success("Đã bỏ bookmark");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setRemovingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="card-glass rounded-2xl p-5 text-sm text-fg/65">
        Ban chua co su kien nao trong bookmark.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((item) => (
        <article className="card-glass rounded-2xl p-5" key={item.id}>
          <p className="text-xs text-fg/60">
            Da luu luc {new Date(item.createdAt).toLocaleString("vi-VN")}
          </p>
          <h3 className="mt-2 text-lg font-semibold leading-6">{item.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-fg/75">{item.summary}</p>
          <div className="mt-4 flex gap-2">
            <Link
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-fg"
              href={`/su-kien/${item.slug}`}
            >
              Xem chi tiet
            </Link>
            <button
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg/80 disabled:opacity-60"
              disabled={removingId === item.eventId}
              onClick={() => void removeBookmark(item.eventId)}
              type="button"
            >
              {removingId === item.eventId ? "Đang xử lý..." : "Bỏ bookmark"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
