"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EventReportActionProps {
  eventId: string;
  className?: string;
}

export function EventReportAction({ eventId, className }: EventReportActionProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReport() {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do báo cáo");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/events/id/${eventId}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: reason.trim(),
          detail: detail.trim() || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không gửi được báo cáo");
      }

      toast.success("Đã gửi báo cáo. Quản trị viên sẽ kiểm tra sớm.");
      setReason("");
      setDetail("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={className}>
      <button
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-400/50 px-4 text-sm font-semibold text-amber-600 transition hover:bg-amber-500/10"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <AlertTriangle className="h-4 w-4" />
        Báo cáo
      </button>

      {open ? (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
          <label className="block text-xs font-semibold text-fg/75">
            Lý do báo cáo
          </label>
          <input
            className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none ring-primary/30 focus:ring-2"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: thông tin sai mốc thời gian, thiếu nguồn..."
            value={reason}
          />

          <label className="block text-xs font-semibold text-fg/75">
            Chi tiết bổ sung (tuỳ chọn)
          </label>
          <textarea
            className="h-20 w-full rounded-lg border border-border bg-bg p-3 text-sm outline-none ring-primary/30 focus:ring-2"
            maxLength={2000}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Mô tả rõ hơn để admin/mod kiểm tra nhanh."
            value={detail}
          />

          <div className="flex justify-end gap-2">
            <button
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg/75 transition hover:border-primary/35 hover:text-primary"
              onClick={() => setOpen(false)}
              type="button"
            >
              Hủy
            </button>
            <button
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
              disabled={submitting}
              onClick={() => void submitReport()}
              type="button"
            >
              {submitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
