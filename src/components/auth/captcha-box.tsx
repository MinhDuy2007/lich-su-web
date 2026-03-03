"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CaptchaBoxProps {
  onChange: (payload: { sessionId: string; answer: string }) => void;
}

export function CaptchaBox({ onChange }: CaptchaBoxProps) {
  const [sessionId, setSessionId] = useState("");
  const [svg, setSvg] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const refreshCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/captcha/new", {
        cache: "no-store"
      });
      const payload = await response.json();
      if (response.ok && payload.success) {
        setSessionId(payload.data.sessionId);
        setSvg(payload.data.svg);
        setAnswer("");
        onChangeRef.current({ sessionId: payload.data.sessionId, answer: "" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Ma xac thuc</label>
        <button
          className="inline-flex items-center gap-1 text-xs text-primary"
          disabled={loading}
          onClick={() => void refreshCaptcha()}
          type="button"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Tai lai
        </button>
      </div>
      <div
        className="flex min-h-[86px] items-center justify-center rounded-xl border border-border bg-card"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <input
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
        onChange={(event) => {
          const next = event.target.value;
          setAnswer(next);
          onChangeRef.current({ sessionId, answer: next });
        }}
        placeholder="Nhap ma xac thuc"
        value={answer}
      />
    </div>
  );
}
