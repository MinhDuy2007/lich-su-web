"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CaptchaBox } from "./captcha-box";
import {
  EMAIL_TAKEN_MESSAGE,
  USERNAME_REGEX,
  USERNAME_TAKEN_MESSAGE
} from "@/lib/register-availability";

const USERNAME_FORMAT_MESSAGE =
  "Tên đăng nhập chỉ gồm a-z, 0-9, _ và dài 4-30 ký tự.";
const OTP_FORMAT_MESSAGE = "Mã OTP phải gồm đúng 8 chữ số.";

interface OtpSendData {
  otpRequestId?: string;
}

interface AvailabilityData {
  username?: {
    taken: boolean;
    suggestions: string[];
  };
  email?: {
    taken: boolean;
  };
}

interface ApiPayload<T = unknown> {
  success?: boolean;
  message?: string;
  details?: unknown;
  data?: T;
}

async function parseApiPayload<T>(response: Response): Promise<ApiPayload<T>> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as ApiPayload<T>;
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

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const OTP_REGEX = /^\d{8}$/;

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

  const [usernameTakenError, setUsernameTakenError] = useState("");
  const [emailTakenError, setEmailTakenError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const availabilityRef = useRef(0);

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const usernameFormatError =
    normalizedUsername.length > 0 && !USERNAME_REGEX.test(normalizedUsername)
      ? USERNAME_FORMAT_MESSAGE
      : "";

  const usernameError = usernameFormatError || usernameTakenError;

  const canCheckUsername =
    normalizedUsername.length > 0 && USERNAME_REGEX.test(normalizedUsername);
  const canCheckEmail = isLikelyEmail(normalizedEmail);

  const canSendOtp = useMemo(() => {
    return canCheckEmail && cooldown === 0 && !sendingOtp && !emailTakenError;
  }, [canCheckEmail, cooldown, sendingOtp, emailTakenError]);

  function applyAvailabilityResult(
    availability: AvailabilityData,
    checkedUsername: string,
    checkedEmail: string
  ) {
    if (checkedUsername) {
      if (availability.username?.taken) {
        setUsernameTakenError(USERNAME_TAKEN_MESSAGE);
        setUsernameSuggestions(availability.username.suggestions ?? []);
      } else {
        setUsernameTakenError("");
        setUsernameSuggestions([]);
      }
    }

    if (checkedEmail) {
      if (availability.email?.taken) {
        setEmailTakenError(EMAIL_TAKEN_MESSAGE);
      } else {
        setEmailTakenError("");
      }
    }
  }

  async function fetchAvailability(
    checkedUsername: string,
    checkedEmail: string
  ) {
    const params = new URLSearchParams();
    if (checkedUsername) {
      params.set("username", checkedUsername);
    }
    if (checkedEmail) {
      params.set("email", checkedEmail);
    }

    if (params.size === 0) {
      return null;
    }

    const response = await fetch(
      `/api/auth/register/check-availability?${params.toString()}`,
      {
        cache: "no-store"
      }
    );
    const payload = await parseApiPayload<AvailabilityData>(response);

    if (!response.ok || !payload.success || !payload.data) {
      return null;
    }

    return payload.data;
  }

  async function refreshAvailabilityNow() {
    const checkedUsername = canCheckUsername ? normalizedUsername : "";
    const checkedEmail = canCheckEmail ? normalizedEmail : "";
    const availability = await fetchAvailability(checkedUsername, checkedEmail);
    if (!availability) {
      return;
    }
    applyAvailabilityResult(availability, checkedUsername, checkedEmail);
  }

  async function sendOtp() {
    if (!canSendOtp) return;

    if (emailTakenError) {
      toast.error(emailTakenError);
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          purpose: "register"
        })
      });
      const payload = await parseApiPayload<OtpSendData>(response);

      if (!response.ok || !payload.success) {
        if (response.status === 409) {
          setEmailTakenError(payload.message ?? EMAIL_TAKEN_MESSAGE);
        }
        throw new Error(buildApiErrorMessage(payload, "Gửi OTP thất bại"));
      }

      setOtpRequestId(payload.data?.otpRequestId ?? "");
      setOtpError("");
      setCooldown(30);
      toast.success("Đã gửi OTP. Kiểm tra email của bạn");
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

  useEffect(() => {
    const checkedUsername = canCheckUsername ? normalizedUsername : "";
    const checkedEmail = canCheckEmail ? normalizedEmail : "";

    if (!checkedUsername) {
      setUsernameTakenError("");
      setUsernameSuggestions([]);
    }

    if (!checkedEmail) {
      setEmailTakenError("");
    }

    if (!checkedUsername && !checkedEmail) {
      setIsCheckingAvailability(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      const requestId = availabilityRef.current + 1;
      availabilityRef.current = requestId;
      setIsCheckingAvailability(true);

      try {
        const availability = await fetchAvailability(checkedUsername, checkedEmail);
        if (!availability || availabilityRef.current !== requestId) {
          return;
        }
        applyAvailabilityResult(availability, checkedUsername, checkedEmail);
      } finally {
        if (availabilityRef.current === requestId) {
          setIsCheckingAvailability(false);
        }
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [canCheckEmail, canCheckUsername, normalizedEmail, normalizedUsername]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (usernameFormatError) {
      toast.error(usernameFormatError);
      return;
    }

    if (usernameTakenError) {
      toast.error(usernameTakenError);
      return;
    }

    if (emailTakenError) {
      toast.error(emailTakenError);
      return;
    }

    if (!otpRequestId) {
      setOtpError("Bạn cần gửi OTP trước khi đăng ký.");
      return;
    }

    if (!OTP_REGEX.test(otpCode)) {
      setOtpError(OTP_FORMAT_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedEmail,
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
        const message = buildApiErrorMessage(payload, "Đăng ký thất bại");
        if (response.status === 409) {
          const raw = (payload.message ?? "").toLowerCase();
          if (raw.includes("username") || raw.includes("tên đăng nhập")) {
            setUsernameTakenError(USERNAME_TAKEN_MESSAGE);
            void refreshAvailabilityNow();
          }
          if (raw.includes("email")) {
            setEmailTakenError(EMAIL_TAKEN_MESSAGE);
          }
        }
        throw new Error(message);
      }

      toast.success("Đăng ký thành công. Vui lòng đăng nhập");
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
        <label className="mb-1 block text-sm font-medium">Tên đăng nhập</label>
        <input
          autoCapitalize="none"
          autoCorrect="off"
          className={`h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none transition ${
            usernameError
              ? "border-red-500 ring-red-300 focus:ring-2"
              : "border-border ring-primary/30 focus:ring-2"
          }`}
          onChange={(event) => {
            setUsername(event.target.value.toLowerCase());
            setUsernameTakenError("");
            setUsernameSuggestions([]);
          }}
          placeholder="Ví dụ: lichsu_user"
          required
          spellCheck={false}
          value={username}
        />
        {usernameError ? (
          <p className="mt-1 text-xs text-red-500">{usernameError}</p>
        ) : null}
        {usernameSuggestions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {usernameSuggestions.map((suggestion) => (
              <button
                className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-fg"
                key={suggestion}
                onClick={() => {
                  setUsername(suggestion);
                  setUsernameTakenError("");
                  setUsernameSuggestions([]);
                }}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          autoCapitalize="none"
          autoCorrect="off"
          className={`h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none transition ${
            emailTakenError
              ? "border-red-500 ring-red-300 focus:ring-2"
              : "border-border ring-primary/30 focus:ring-2"
          }`}
          onChange={(event) => {
            setEmail(event.target.value.toLowerCase());
            setEmailTakenError("");
          }}
          required
          type="email"
          value={email}
        />
        {emailTakenError ? (
          <p className="mt-1 text-xs text-red-500">{emailTakenError}</p>
        ) : null}
      </div>

      {isCheckingAvailability ? (
        <p className="text-xs text-fg/65">Đang kiểm tra tên đăng nhập và email...</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Xác nhận mật khẩu</label>
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
          <label className="text-sm font-medium">Mã OTP (8 số)</label>
          <button
            className="rounded-lg border border-primary/40 px-3 py-1 text-xs font-semibold text-primary disabled:opacity-60"
            disabled={!canSendOtp}
            onClick={() => void sendOtp()}
            type="button"
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi OTP"}
          </button>
        </div>
        <input
          autoComplete="one-time-code"
          className={`h-11 w-full rounded-xl border bg-bg px-3 text-sm outline-none transition ${
            otpError
              ? "border-red-500 ring-red-300 focus:ring-2"
              : "border-border ring-primary/30 focus:ring-2"
          }`}
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => {
            setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8));
            setOtpError("");
          }}
          placeholder="Nhập OTP 8 số"
          required
          type="text"
          value={otpCode}
        />
        {otpError ? <p className="mt-1 text-xs text-red-500">{otpError}</p> : null}
        <p className="mt-1 text-xs text-fg/65">
          OTP được gửi qua Supabase Auth Email, tối đa 2 lần trong 1 giờ.
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
        {loading ? "Đang xử lý..." : "Tạo tài khoản"}
      </button>

      <div className="text-sm">
        Đã có tài khoản?{" "}
        <Link className="text-primary underline-offset-2 hover:underline" href="/auth/dang-nhap">
          Đăng nhập
        </Link>
      </div>
    </form>
  );
}
