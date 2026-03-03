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
        throw new Error(payload.message ?? "Gui de xuat that bai");
      }
      toast.success("Da gui de xuat cho admin kiem duyet");
      setTitle("");
      setSummary("");
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-5">
      <h2 className="mb-2 text-lg font-semibold">De xuat su kien moi</h2>
      <p className="mb-3 text-xs text-fg/65">
        Noi dung se duoc moderator/admin duyet truoc khi xuat ban.
      </p>
      <div className="space-y-2">
        <input
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tieu de"
          value={title}
        />
        <textarea
          className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Mo ta ngan"
          value={summary}
        />
        <textarea
          className="h-28 w-full rounded-xl border border-border bg-card p-3 text-sm"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Noi dung chi tiet"
          value={content}
        />
      </div>
      <button
        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
        disabled={loading || title.trim().length < 3 || summary.trim().length < 10 || content.trim().length < 20}
        onClick={submit}
        type="button"
      >
        Gui de xuat
      </button>
    </section>
  );
}

