"use client";

import { useState } from "react";
import { toast } from "sonner";

export function GeminiKeyForm() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveKey() {
    try {
      setLoading(true);
      const response = await fetch("/api/ai/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong luu duoc API key");
      }
      toast.success("Da luu Gemini API key");
      setApiKey("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading(false);
    }
  }

  async function removeKey() {
    try {
      setLoading(true);
      const response = await fetch("/api/ai/key", {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong xoa duoc API key");
      }
      toast.success("Da xoa API key");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-5">
      <h2 className="mb-2 text-lg font-semibold">Google AI Studio API key ca nhan</h2>
      <p className="mb-3 text-xs text-fg/65">
        Key duoc ma hoa truoc khi luu vao co so du lieu. Mac dinh dang dung model Gemma 27B.
      </p>
      <input
        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
        onChange={(event) => setApiKey(event.target.value)}
        placeholder="AIza..."
        type="password"
        value={apiKey}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
          disabled={loading || apiKey.trim().length < 20}
          onClick={saveKey}
          type="button"
        >
          Luu key
        </button>
        <button
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg/80 disabled:opacity-60"
          disabled={loading}
          onClick={removeKey}
          type="button"
        >
          Xoa key
        </button>
      </div>
    </section>
  );
}
