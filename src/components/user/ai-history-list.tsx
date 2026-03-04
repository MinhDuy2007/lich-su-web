"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

interface AiHistoryItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  eventId: string | null;
}

interface AiHistoryListProps {
  items: AiHistoryItem[];
}

export function AiHistoryList({ items }: AiHistoryListProps) {
  const [rows, setRows] = useState(items);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [loading, setLoading] = useState<"none" | "remove" | "clear">("none");

  const selected = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId]
  );

  async function clearAll() {
    setLoading("clear");
    try {
      const response = await fetch("/api/account/ai-history", {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong xoa duoc lich su");
      }
      setRows([]);
      setSelectedId("");
      toast.success("Da xoa toan bo lich su AI");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Loi he thong");
    } finally {
      setLoading("none");
    }
  }

  async function removeOne(id: string) {
    setLoading("remove");
    try {
      const response = await fetch(`/api/account/ai-history/${id}`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong xoa duoc ban ghi");
      }

      setRows((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        const next = rows.find((item) => item.id !== id);
        setSelectedId(next?.id ?? "");
      }
      toast.success("Da xoa ban ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Loi he thong");
    } finally {
      setLoading("none");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="card-glass rounded-2xl p-5 text-sm text-fg/65">
        Chua co lich su AI.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="card-glass rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">
            Lich su hoi dap
          </h2>
          <button
            className="rounded-lg border border-red-400 px-2 py-1 text-xs text-red-500 disabled:opacity-60"
            disabled={loading !== "none"}
            onClick={() => void clearAll()}
            type="button"
          >
            {loading === "clear" ? "Dang xoa..." : "Clear all"}
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map((item) => (
            <li key={item.id}>
              <button
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selected?.id === item.id
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <p className="text-xs text-fg/60">
                  {item.role === "user" ? "Nguoi dung" : "Tro ly"} -{" "}
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 line-clamp-2">{item.content}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-glass rounded-2xl p-5">
        {selected ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-fg/60">
                  {selected.role === "user" ? "Cau hoi user" : "Phan hoi AI"}
                </p>
                <p className="text-xs text-fg/55">
                  {new Date(selected.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <button
                className="rounded-lg border border-red-400 px-3 py-1 text-xs text-red-500 disabled:opacity-60"
                disabled={loading !== "none"}
                onClick={() => void removeOne(selected.id)}
                type="button"
              >
                {loading === "remove" ? "Dang xoa..." : "Xoa ban ghi"}
              </button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-sm leading-7 text-fg/80">
              {selected.content}
            </div>
          </>
        ) : (
          <p className="text-sm text-fg/65">Chon mot ban ghi de xem chi tiet.</p>
        )}
      </section>
    </div>
  );
}
