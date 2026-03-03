"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CaptchaBox } from "./captcha-box";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaSessionId, setCaptchaSessionId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          captchaSessionId,
          captchaAnswer
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Dang nhap that bai");
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: payload.data.session.access_token,
        refresh_token: payload.data.session.refresh_token
      });
      if (error) {
        throw error;
      }

      toast.success("Dang nhap thanh cong");
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium">Ten dang nhap</label>
        <input
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setUsername(event.target.value)}
          required
          value={username}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Mat khau</label>
        <input
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      <CaptchaBox
        onChange={({ sessionId, answer }) => {
          setCaptchaSessionId(sessionId);
          setCaptchaAnswer(answer);
        }}
      />

      <button
        className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-fg disabled:opacity-65"
        disabled={loading}
        type="submit"
      >
        {loading ? "Dang xu ly..." : "Dang nhap"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <Link className="text-primary underline-offset-2 hover:underline" href="/auth/quen-mat-khau">
          Quen mat khau?
        </Link>
        <Link className="text-primary underline-offset-2 hover:underline" href="/auth/dang-ky">
          Tao tai khoan
        </Link>
      </div>
    </form>
  );
}

