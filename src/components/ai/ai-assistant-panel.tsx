"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { MarkdownContent } from "@/components/ui/markdown-content";

interface AiAssistantPanelProps {
  eventId: string;
  initialSummary: string | null;
  autoSummarizeSignal?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  details?: unknown;
  data?: T;
}

async function readApiEnvelope<T>(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

function detailsToText(details: unknown) {
  if (typeof details === "string" && details.trim()) {
    return details;
  }

  if (details && typeof details === "object") {
    try {
      return JSON.stringify(details);
    } catch {
      return "";
    }
  }

  return "";
}

const SUGGESTIONS = [
  "Sự kiện này ảnh hưởng gì đến Việt Nam?",
  "Nêu 3 ý quan trọng nhất của sự kiện.",
  "Gợi ý sự kiện liên quan để đọc tiếp."
];

export function AiAssistantPanel({
  eventId,
  initialSummary,
  autoSummarizeSignal
}: AiAssistantPanelProps) {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState<"none" | "summary" | "ask">("none");
  const [error, setError] = useState("");
  const lastSignal = useRef<number | undefined>(autoSummarizeSignal);

  const summarize = useCallback(async () => {
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
      const payload = await readApiEnvelope<{ summary: string }>(response);

      if (!response.ok) {
        const detailText = detailsToText(payload?.details);
        throw new Error(detailText || payload?.message || `Không thể tóm tắt (HTTP ${response.status})`);
      }
      if (!payload?.success || !payload.data?.summary) {
        throw new Error(payload?.message ?? "Không thể tạo tóm tắt");
      }

      setSummary(payload.data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setLoading("none");
    }
  }, [eventId]);

  useEffect(() => {
    if (typeof autoSummarizeSignal === "undefined") {
      return;
    }

    if (autoSummarizeSignal === lastSignal.current) {
      return;
    }

    lastSignal.current = autoSummarizeSignal;
    void summarize();
  }, [autoSummarizeSignal, summarize]);

  async function ask() {
    if (!question.trim()) {
      return;
    }

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
      const payload = await readApiEnvelope<{ answer: string }>(response);

      if (!response.ok) {
        const detailText = detailsToText(payload?.details);
        throw new Error(detailText || payload?.message || `Không thể hỏi AI (HTTP ${response.status})`);
      }
      if (!payload?.success || !payload.data?.answer) {
        throw new Error(payload?.message ?? "Không thể nhận phản hồi từ AI");
      }

      setAnswer(payload.data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setLoading("none");
    }
  }

  return (
    <section className="card-glass rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Trò chuyện với AI</h3>
      </div>
      <p className="mb-4 text-sm text-fg/75">
        Nhận tóm tắt nhanh hoặc hỏi đáp theo đúng ngữ cảnh của sự kiện này.
      </p>

      <button
        className="mb-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
        disabled={loading !== "none"}
        onClick={() => void summarize()}
        type="button"
      >
        {loading === "summary" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Tóm tắt nhanh
      </button>

      <div className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-fg/80">
        {summary ? (
          <MarkdownContent content={summary} />
        ) : (
          <p>Chưa có tóm tắt. Hãy bấm nút để tạo tóm tắt nhanh.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-fg/80 transition hover:border-primary/40 hover:text-primary"
            key={suggestion}
            onClick={() => setQuestion(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium" htmlFor="ai-question">
          Câu hỏi của bạn
        </label>
        <textarea
          className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          id="ai-question"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ví dụ: Sự kiện này tác động thế nào đến khu vực?"
          value={question}
        />
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
          disabled={loading !== "none"}
          onClick={() => void ask()}
          type="button"
        >
          {loading === "ask" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Gửi câu hỏi
        </button>
      </div>

      {answer ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-fg/80">
          <MarkdownContent content={answer} />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-red-500">{error}</p> : null}
    </section>
  );
}
