"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export function TagsAdmin() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState<TagItem[]>([]);

  async function loadTags() {
    const response = await fetch("/api/admin/tags");
    const payload = await response.json();
    if (response.ok && payload.success) {
      setTags(payload.data.items);
    }
  }

  useEffect(() => {
    void loadTags();
  }, []);

  async function createTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Tao tag that bai");
      return;
    }
    toast.success("Da tao tag");
    setName("");
    setSlug("");
    await loadTags();
  }

  async function removeTag(id: string) {
    const response = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Xoa tag that bai");
      return;
    }
    toast.success("Da xoa tag");
    await loadTags();
  }

  return (
    <div className="space-y-5">
      <form className="card-glass rounded-2xl p-5" onSubmit={createTag}>
        <h2 className="mb-3 text-lg font-semibold">Them tag</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ten tag"
            required
            value={name}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Slug"
            required
            value={slug}
          />
        </div>
        <button className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg" type="submit">
          Tao tag
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Danh sach tag</h2>
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2" key={tag.id}>
              <p className="text-sm">
                {tag.name} <span className="text-fg/60">({tag.slug})</span>
              </p>
              <button
                className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500"
                onClick={() => void removeTag(tag.id)}
                type="button"
              >
                Xoa
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

