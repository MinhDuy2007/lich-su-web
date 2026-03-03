"use client";

import { useState } from "react";
import { toast } from "sonner";

interface PersonalActionsProps {
  eventId: string;
}

export function PersonalActions({ eventId }: PersonalActionsProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function toggleFavorite() {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/id/${eventId}/favorite`, {
        method: isFavorite ? "DELETE" : "POST"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong cap nhat duoc yeu thich");
      }
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? "Da bo yeu thich" : "Da them vao yeu thich");
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
        disabled={loading}
        onClick={toggleFavorite}
        type="button"
      >
        {isFavorite ? "Bo yeu thich" : "Them vao yeu thich"}
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
