"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CaptchaBox } from "./captcha-box";

interface ApiPayload {
  success?: boolean;
  message?: string;
  details?: unknown;
  data?: {
    otpRequestId?: string;
  };
}

async function parseApiPayload(response: Response): Promise<ApiPayload> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as ApiPayload;
  } catch {
    return { message: text };
  }
}

function buildApiErrorMessage(payload: ApiPayload, fallback: string) {
  const base = payload.message ?? fallback;
  const detail = typeof payload.details === "string" ? payload.details : null;
  return detail ? `${base}: ${detail}` : base;
}

function buildUiError(error: unknown) {
  if (error instanceof Error && error.message.includes("Failed to fetch")) {
    return "Khong ket noi duoc server. Hay kiem tra server dev va thu lai.";
  }
  return error instanceof Error ? error.message : "Loi he thong";
}

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [captchaSessionId, setCaptchaSessionId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const canSendOtp = useMemo(() => {
    return email.length > 5 && cooldown === 0 && !sendingOtp;
  }, [cooldown, email.length, sendingOtp]);

  async function sendOtp() {
    if (!canSendOtp) return;
    setSendingOtp(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: "register"
        })
      });
      const payload = await parseApiPayload(response);
      if (!response.ok || !payload.success) {
        throw new Error(buildApiErrorMessage(payload, "Gui OTP that bai"));
      }

      setOtpRequestId(payload.data?.otpRequestId ?? "");
      setCooldown(30);
      toast.success("Da gui OTP. Kiem tra email cua ban");
    } catch (err) {
      toast.error(buildUiError(err));
    } finally {
      setSendingOtp(false);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          confirmPassword,
          otpRequestId,
          otpCode,
          captchaSessionId,
          captchaAnswer
        })
      });
      const payload = await parseApiPayload(response);
      if (!response.ok || !payload.success) {
        throw new Error(buildApiErrorMessage(payload, "Dang ky that bai"));
      }

      toast.success("Dang ky thanh cong. Vui long dang nhap");
      router.push("/auth/dang-nhap");
      router.refresh();
    } catch (err) {
      toast.error(buildUiError(err));
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
          placeholder="vd: lichsu_user"
          required
          value={username}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
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
        <div>
          <label className="mb-1 block text-sm font-medium">Xac nhan mat khau</label>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-sm font-medium">Ma OTP (6-8 so)</label>
          <button
            className="rounded-lg border border-primary/40 px-3 py-1 text-xs font-semibold text-primary disabled:opacity-60"
            disabled={!canSendOtp}
            onClick={() => void sendOtp()}
            type="button"
          >
            {cooldown > 0 ? `Gui lai sau ${cooldown}s` : "Gui OTP"}
          </button>
        </div>
        <input
          className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setOtpCode(event.target.value)}
          pattern="\d{6,8}"
          placeholder="Nhap OTP 6-8 so"
          required
          value={otpCode}
        />
        <p className="mt-1 text-xs text-fg/65">
          OTP duoc gui boi Supabase Auth Email, toi da 2 lan trong 1 gio.
        </p>
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
        {loading ? "Dang xu ly..." : "Tao tai khoan"}
      </button>

      <div className="text-sm">
        Da co tai khoan?{" "}
        <Link className="text-primary underline-offset-2 hover:underline" href="/auth/dang-nhap">
          Dang nhap
        </Link>
      </div>
    </form>
  );
}
