"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirmPopup } from "@/components/ui/confirm-popup";

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export function TagsAdmin() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState<TagItem[]>([]);
  const { confirm, confirmPopup } = useConfirmPopup();

  async function loadTags() {
    const response = await fetch("/api/admin/tags", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setTags(payload.data.items ?? []);
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
      toast.error(payload.message ?? "Tạo thẻ thất bại");
      return;
    }

    toast.success("Đã tạo thẻ");
    setName("");
    setSlug("");
    await loadTags();
  }

  async function removeTag(id: string) {
    const accepted = await confirm({
      title: "Xóa thẻ",
      message: "Bạn có chắc muốn xóa thẻ này?",
      confirmLabel: "Xóa",
      destructive: true
    });
    if (!accepted) return;

    const response = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Xóa thẻ thất bại");
      return;
    }

    toast.success("Đã xóa thẻ");
    await loadTags();
  }

  return (
    <div className="space-y-5">
      {confirmPopup}
      <form className="card-glass rounded-2xl p-5" onSubmit={createTag}>
        <h2 className="mb-3 text-lg font-semibold">Thêm thẻ</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setName(event.target.value)}
            placeholder="Tên thẻ"
            required
            value={name}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Đường dẫn thẻ"
            required
            value={slug}
          />
        </div>
        <button
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
          type="submit"
        >
          Lưu thẻ
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Danh sách thẻ</h2>
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li
              className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
              key={tag.id}
            >
              <p className="text-sm">
                {tag.name} <span className="text-fg/60">({tag.slug})</span>
              </p>
              <button
                className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500"
                onClick={() => void removeTag(tag.id)}
                type="button"
              >
                Xóa
              </button>
            </li>
          ))}
          {tags.length === 0 ? <li className="text-sm text-fg/65">Chưa có thẻ nào.</li> : null}
        </ul>
      </section>
    </div>
  );
}
