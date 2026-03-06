"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ApiPayload {
  success?: boolean;
  message?: string;
  details?: unknown;
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

function buildApiMessage(payload: ApiPayload, fallback: string) {
  const detail = typeof payload.details === "string" ? `: ${payload.details}` : "";
  return `${payload.message ?? fallback}${detail}`;
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword
        })
      });
      const payload = await parseApiPayload(response);
      if (!response.ok || !payload.success) {
        throw new Error(buildApiMessage(payload, "Không đổi được mật khẩu"));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Đã đổi mật khẩu thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-semibold">Doi mat khau</h2>
      <p className="mt-1 text-sm text-fg/65">
        Yeu cau nhap dung mat khau hien tai. Khong su dung OTP.
      </p>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">Mat khau hien tai</label>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Mat khau moi</label>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Xac nhan mat khau moi</label>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
            minLength={8}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            required
            type="password"
            value={confirmNewPassword}
          />
        </div>
        <button
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </button>
      </form>
    </section>
  );
}
