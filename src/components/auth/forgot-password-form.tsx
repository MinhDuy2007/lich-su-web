"use client";

import { useEffect, useState } from "react";
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
    return "Không kết nối được server. Hãy kiểm tra server dev và thử lại.";
  }
  return error instanceof Error ? error.message : "Lỗi hệ thống";
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [captchaSessionId, setCaptchaSessionId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const canSend = email.length > 5 && cooldown === 0 && !loadingSend;

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

  async function sendOtp() {
    if (!canSend) return;
    setLoadingSend(true);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          captchaSessionId,
          captchaAnswer
        })
      });
      const payload = await parseApiPayload(response);
      if (!response.ok || !payload.success) {
        throw new Error(buildApiErrorMessage(payload, "Gửi OTP thất bại"));
      }
      setOtpRequestId(payload.data?.otpRequestId ?? "");
      setCooldown(30);
      toast.success("Đã gửi OTP đặt lại mật khẩu");
    } catch (err) {
      toast.error(buildUiError(err));
    } finally {
      setLoadingSend(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingReset(true);
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otpRequestId,
          otpCode,
          newPassword,
          confirmPassword
        })
      });
      const payload = await parseApiPayload(response);
      if (!response.ok || !payload.success) {
        throw new Error(buildApiErrorMessage(payload, "Đặt lại mật khẩu thất bại"));
      }
      toast.success("Đặt lại mật khẩu thành công");
      router.push("/auth/dang-nhap");
      router.refresh();
    } catch (err) {
      toast.error(buildUiError(err));
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={resetPassword}>
      <div>
        <label className="mb-1 block text-sm font-medium">Email tài khoản</label>
        <input
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <CaptchaBox
        onChange={({ sessionId, answer }) => {
          setCaptchaSessionId(sessionId);
          setCaptchaAnswer(answer);
        }}
      />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-sm font-medium">OTP đặt lại</label>
          <button
            className="rounded-lg border border-primary/40 px-3 py-1 text-xs font-semibold text-primary disabled:opacity-60"
            disabled={!canSend}
            onClick={() => void sendOtp()}
            type="button"
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi OTP"}
          </button>
        </div>
        <input
          className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setOtpCode(event.target.value)}
          pattern="\\d{6,8}"
          placeholder="Nhập OTP 8 số"
          required
          value={otpCode}
        />
        <p className="mt-1 text-xs text-fg/65">
          OTP có thể bị rơi vào spam, vui lòng kiểm tra cả mục spam
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Mật khẩu mới"
          required
          type="password"
          value={newPassword}
        />
        <input
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu mới"
          required
          type="password"
          value={confirmPassword}
        />
      </div>

      <button
        className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-fg disabled:opacity-65"
        disabled={loadingReset || !otpRequestId}
        type="submit"
      >
        {loadingReset ? "Đang xử lý..." : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}
