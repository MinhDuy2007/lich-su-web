"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirmPopup } from "@/components/ui/confirm-popup";

interface SourceItem {
  id: string;
  name: string;
  url: string | null;
}

export function SourcesAdmin() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const { confirm, confirmPopup } = useConfirmPopup();

  async function loadSources() {
    const response = await fetch("/api/admin/sources", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setSources(payload.data.items ?? []);
    }
  }

  useEffect(() => {
    void loadSources();
  }, []);

  async function createSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        url: url || null
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Tạo nguồn thất bại");
      return;
    }

    toast.success("Đã tạo nguồn");
    setName("");
    setUrl("");
    await loadSources();
  }

  async function removeSource(id: string) {
    const accepted = await confirm({
      title: "Xóa nguồn",
      message: "Bạn có chắc muốn xóa nguồn này?",
      confirmLabel: "Xóa",
      destructive: true
    });
    if (!accepted) return;

    const response = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Xóa nguồn thất bại");
      return;
    }

    toast.success("Đã xóa nguồn");
    await loadSources();
  }

  return (
    <div className="space-y-5">
      {confirmPopup}
      <form className="card-glass rounded-2xl p-5" onSubmit={createSource}>
        <h2 className="mb-3 text-lg font-semibold">Thêm nguồn</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setName(event.target.value)}
            placeholder="Tên nguồn"
            required
            value={name}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            type="url"
            value={url}
          />
        </div>
        <button
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
          type="submit"
        >
          Lưu nguồn
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Danh sách nguồn</h2>
        <ul className="space-y-2">
          {sources.map((source) => (
            <li className="rounded-xl border border-border bg-card px-3 py-2" key={source.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{source.name}</p>
                  {source.url ? (
                    <a
                      className="text-xs text-primary underline"
                      href={source.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {source.url}
                    </a>
                  ) : (
                    <p className="text-xs text-fg/60">Chưa có liên kết</p>
                  )}
                </div>
                <button
                  className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500"
                  onClick={() => void removeSource(source.id)}
                  type="button"
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
          {sources.length === 0 ? (
            <li className="text-sm text-fg/65">Chưa có nguồn nào.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
