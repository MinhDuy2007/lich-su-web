"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface SubmissionItem {
  id: string;
  title: string;
  summary: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const SUBMISSION_STATUS_LABEL: Record<SubmissionItem["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối"
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function ModerationAdmin() {
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  async function loadItems() {
    const response = await fetch("/api/admin/moderation", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setItems(payload.data.items ?? []);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleAction(submissionId: string, action: "approve" | "reject") {
    if (processingIds.includes(submissionId)) return;

    setProcessingIds((prev) => [...prev, submissionId]);
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          action
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Xử lý kiểm duyệt thất bại");
      }

      toast.success(action === "approve" ? "Đã duyệt đề xuất" : "Đã từ chối đề xuất");
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== submissionId));
    }
  }

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "pending").length,
    [items]
  );

  return (
    <section className="card-glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Danh sách đề xuất sự kiện</h2>
        <p className="text-xs text-fg/65">Đang chờ duyệt: {pendingCount}</p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const isProcessing = processingIds.includes(item.id);
          return (
            <li className="rounded-xl border border-border bg-card p-4" key={item.id}>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-fg/70">{item.summary}</p>
              <p className="mt-2 text-xs text-fg/60">Cập nhật: {formatDateLabel(item.created_at)}</p>
              <p className="mt-1 text-xs text-fg/60">
                Trạng thái: {SUBMISSION_STATUS_LABEL[item.status]}
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-fg disabled:opacity-60"
                  disabled={isProcessing}
                  onClick={() => void handleAction(item.id, "approve")}
                  type="button"
                >
                  Duyệt
                </button>
                <button
                  className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                  disabled={isProcessing}
                  onClick={() => void handleAction(item.id, "reject")}
                  type="button"
                >
                  Từ chối
                </button>
              </div>
            </li>
          );
        })}

        {items.length === 0 ? (
          <li className="text-sm text-fg/60">Chưa có đề xuất nào.</li>
        ) : null}
      </ul>
    </section>
  );
}
