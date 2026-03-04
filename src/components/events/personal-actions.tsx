"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PersonalActionsProps {
  eventId: string;
}

export function PersonalActions({ eventId }: PersonalActionsProps) {
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
        throw new Error(payload.message ?? "Khong cap nhat duoc bookmark");
      }
      setIsFavorite(Boolean(payload.data.isBookmarked));
      toast.success(payload.data.isBookmarked ? "Da luu bookmark" : "Da bo bookmark");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
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
        throw new Error(payload.message ?? "Khong luu duoc ghi chu");
      }
      toast.success("Da luu ghi chu");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-6">
      <h3 className="mb-3 text-lg font-semibold">Hanh dong ca nhan</h3>
      <button
        className="mb-4 rounded-xl border border-primary/50 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
        disabled={loading || loadingStatus}
        onClick={toggleFavorite}
        type="button"
      >
        {loadingStatus ? "Dang tai..." : isFavorite ? "Da luu" : "Bookmark"}
      </button>
      <textarea
        className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ghi chu cua ban"
        value={note}
      />
      <button
        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
        disabled={loading || note.trim().length === 0}
        onClick={saveNote}
        type="button"
      >
        Luu ghi chu
      </button>
    </section>
  );
}
