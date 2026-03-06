"use client";

import { useState } from "react";
import { toast } from "sonner";

export function SubmissionForm() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      const response = await fetch("/api/events/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          content,
          tags: [],
          people: [],
          places: [],
          imageUrls: []
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Gửi đề xuất thất bại");
      }
      toast.success("Đã gửi đề xuất cho quản trị viên kiểm duyệt");
      setTitle("");
      setSummary("");
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-5">
      <h2 className="mb-2 text-lg font-semibold">Đề xuất sự kiện mới</h2>
      <p className="mb-3 text-xs text-fg/65">
        Nội dung sẽ được kiểm duyệt trước khi xuất bản.
      </p>
      <div className="space-y-2">
        <input
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tiêu đề"
          value={title}
        />
        <textarea
          className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Mô tả ngắn"
          value={summary}
        />
        <textarea
          className="h-28 w-full rounded-xl border border-border bg-card p-3 text-sm"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Nội dung chi tiết"
          value={content}
        />
      </div>
      <button
        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
        disabled={
          loading ||
          title.trim().length < 3 ||
          summary.trim().length < 10 ||
          content.trim().length < 20
        }
        onClick={submit}
        type="button"
      >
        Gửi đề xuất
      </button>
    </section>
  );
}
