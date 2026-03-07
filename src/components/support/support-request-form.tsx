"use client";

import { FormEvent, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

interface SupportRequestFormState {
  email: string;
  fullName: string;
  phone: string;
  message: string;
}

const emptyForm: SupportRequestFormState = {
  email: "",
  fullName: "",
  phone: "",
  message: ""
};

export function SupportRequestForm() {
  const [form, setForm] = useState<SupportRequestFormState>(emptyForm);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      const response = await fetch("/api/support/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không gửi được yêu cầu hỗ trợ");
      }

      toast.success("Đã gửi nội dung cho đội ngũ hỗ trợ.");
      setForm(emptyForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-glass rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Gửi cho đội ngũ hỗ trợ</h2>
      </div>
      <p className="mb-4 text-sm text-fg/70">
        Dùng biểu mẫu này khi bạn cần phản hồi lỗi, góp ý nội dung hoặc cần hỗ trợ thêm.
      </p>

      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-fg/70">Email</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="ban@example.com"
              required
              type="email"
              value={form.email}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Họ và tên</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              placeholder="Nhập họ và tên"
              required
              value={form.fullName}
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-fg/70">Số điện thoại</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="Ví dụ: 0901234567"
              value={form.phone}
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs text-fg/70">Nội dung cần truyền đạt</span>
          <textarea
            className="h-36 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Mô tả ngắn gọn vấn đề hoặc nội dung bạn muốn gửi."
            required
            value={form.message}
          />
        </label>

        <button
          className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-60"
          disabled={
            loading ||
            form.email.trim().length === 0 ||
            form.fullName.trim().length < 2 ||
            form.message.trim().length < 10
          }
          type="submit"
        >
          {loading ? "Đang gửi..." : "Gửi cho đội ngũ hỗ trợ"}
        </button>
      </form>
    </section>
  );
}
