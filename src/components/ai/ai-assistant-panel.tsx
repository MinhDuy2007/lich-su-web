"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

interface AiAssistantPanelProps {
  eventId: string;
  initialSummary: string | null;
}

export function AiAssistantPanel({
  eventId,
  initialSummary
}: AiAssistantPanelProps) {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState<"none" | "summary" | "ask">("none");
  const [error, setError] = useState("");

  async function summarize() {
    try {
      setLoading("summary");
      setError("");
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          style: "paragraph",
          length: "short"
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong the tom tat");
      }
      setSummary(payload.data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading("none");
    }
  }

  async function ask() {
    if (!question.trim()) return;
    try {
      setLoading("ask");
      setError("");
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          question
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Khong the hoi AI");
      }
      setAnswer(payload.data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading("none");
    }
  }

  return (
    <section className="card-glass rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Tro ly AI Gemma 27B</h3>
      </div>

      <button
        className="mb-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
        disabled={loading !== "none"}
        onClick={summarize}
        type="button"
      >
        {loading === "summary" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : null}
        Tom tat bang AI
      </button>

      <div className="rounded-xl border border-border bg-card p-3 text-sm leading-6 text-fg/80">
        {summary || "Chua co tom tat. Bam nut de tao tom tat."}
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium">Dat cau hoi voi AI</label>
        <textarea
          className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Nhap cau hoi..."
          value={question}
        />
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
          disabled={loading !== "none"}
          onClick={ask}
          type="button"
        >
          {loading === "ask" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : null}
          Gui cau hoi
        </button>
      </div>

      {answer ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-3 text-sm leading-6 text-fg/80">
          {answer}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
      ) : null}
    </section>
  );
}
