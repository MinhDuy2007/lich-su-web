"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SourceItem {
  id: string;
  name: string;
  url: string | null;
}

export function SourcesAdmin() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState<SourceItem[]>([]);

  async function loadSources() {
    const response = await fetch("/api/admin/sources");
    const payload = await response.json();
    if (response.ok && payload.success) {
      setSources(payload.data.items);
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
      toast.error(payload.message ?? "Tao nguon that bai");
      return;
    }
    toast.success("Da tao nguon");
    setName("");
    setUrl("");
    await loadSources();
  }

  async function removeSource(id: string) {
    const response = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Xoa nguon that bai");
      return;
    }
    toast.success("Da xoa nguon");
    await loadSources();
  }

  return (
    <div className="space-y-5">
      <form className="card-glass rounded-2xl p-5" onSubmit={createSource}>
        <h2 className="mb-3 text-lg font-semibold">Them nguon</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ten nguon"
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
        <button className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg" type="submit">
          Tao nguon
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Danh sach nguon</h2>
        <ul className="space-y-2">
          {sources.map((source) => (
            <li className="rounded-xl border border-border bg-card px-3 py-2" key={source.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{source.name}</p>
                  {source.url ? (
                    <a className="text-xs text-primary underline" href={source.url}>
                      {source.url}
                    </a>
                  ) : (
                    <p className="text-xs text-fg/60">Khong co URL</p>
                  )}
                </div>
                <button
                  className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500"
                  onClick={() => void removeSource(source.id)}
                  type="button"
                >
                  Xoa
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

