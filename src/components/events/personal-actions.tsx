"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface PersonalActionsProps {
  eventId: string;
  mode?: "full" | "compact";
  className?: string;
}

export function PersonalActions({
  eventId,
  mode = "full",
  className
}: PersonalActionsProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(`/api/events/id/${eventId}/favorite`, {
          method: "GET"
        });
        const payload = await response.json();

        if (!cancelled && response.ok && payload.success) {
          setIsFavorite(Boolean(payload.data.isBookmarked));
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false);
        }
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function toggleFavorite() {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/id/${eventId}/favorite`, {
        method: isFavorite ? "DELETE" : "POST"
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được mục đã lưu");
      }

      const nextBookmarked = Boolean(payload.data.isBookmarked);
      setIsFavorite(nextBookmarked);
      toast.success(nextBookmarked ? "Đã lưu sự kiện" : "Đã bỏ lưu sự kiện");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  async function saveNote() {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/id/${eventId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note })
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không lưu được ghi chú");
      }

      toast.success("Đã lưu ghi chú");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  const favoriteLabel = loadingStatus
    ? "Đang tải..."
    : isFavorite
      ? "Bỏ lưu"
      : "Lưu sự kiện";

  if (mode === "compact") {
    return (
      <button
        className={cn(
          "inline-flex h-10 items-center rounded-xl border border-primary/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-fg disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        disabled={loading || loadingStatus}
        onClick={toggleFavorite}
        type="button"
      >
        {favoriteLabel}
      </button>
    );
  }

  return (
    <section className={cn("card-glass rounded-2xl p-6", className)}>
      <h3 className="mb-3 text-lg font-semibold">Hành động cá nhân</h3>
      <button
        className="mb-4 rounded-xl border border-primary/50 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
        disabled={loading || loadingStatus}
        onClick={toggleFavorite}
        type="button"
      >
        {favoriteLabel}
      </button>
      <textarea
        className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ghi chú của bạn"
        value={note}
      />
      <button
        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
        disabled={loading || note.trim().length === 0}
        onClick={saveNote}
        type="button"
      >
        Lưu ghi chú
      </button>
    </section>
  );
}
