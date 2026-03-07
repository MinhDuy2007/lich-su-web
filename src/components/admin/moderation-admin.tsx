"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import { stripHtml } from "@/lib/event-editor";

interface SubmissionItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  review_note?: string | null;
  submitter: {
    userId: string;
    username: string;
    displayName: string;
    role: "user" | "moderator" | "admin" | null;
  } | null;
}

interface ModerationAdminProps {
  role: "admin" | "moderator";
}

const SUBMISSION_STATUS_LABEL: Record<SubmissionItem["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối"
};

const CONTRIBUTOR_ROLE_LABEL: Record<"moderator" | "admin", string> = {
  moderator: "Moderator",
  admin: "Admin"
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

function renderContributorRoleBadge(role: "user" | "moderator" | "admin" | null | undefined) {
  if (!role || role === "user") {
    return null;
  }

  return (
    <span
      className={
        role === "admin"
          ? "rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
          : "rounded-full border border-sky-400/60 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300"
      }
    >
      {CONTRIBUTOR_ROLE_LABEL[role]}
    </span>
  );
}

function ContributorLine({ item }: { item: SubmissionItem }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      Người đóng góp: {item.submitter?.displayName ?? "Người dùng"}
      {item.submitter?.username ? ` (@${item.submitter.username})` : ""}
      {renderContributorRoleBadge(item.submitter?.role)}
    </span>
  );
}

export function ModerationAdmin({ role }: ModerationAdminProps) {
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadItems() {
    const response = await fetch("/api/admin/moderation", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setItems(payload.data.items ?? []);
    } else {
      toast.error(payload.message ?? "Không tải được danh sách kiểm duyệt");
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleAction(submissionId: string, action: "approve" | "reject") {
    if (processingIds.includes(submissionId) || role !== "admin") return;

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

      toast.success(
        action === "approve"
          ? "Đã duyệt đề xuất và chuyển thành bản nháp để biên tập"
          : "Đã từ chối đề xuất"
      );
      await loadItems();
      setSelectedId(null);
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
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    <section className="card-glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Danh sách đề xuất sự kiện</h2>
        <p className="text-xs text-fg/65">Đang chờ duyệt: {pendingCount}</p>
      </div>

      {role !== "admin" ? (
        <p className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-fg/70">
          Tài khoản kiểm duyệt viên chỉ có quyền xem. Quyết định duyệt hoặc từ chối do admin thực
          hiện.
        </p>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => {
          const isProcessing = processingIds.includes(item.id);
          return (
            <li className="rounded-xl border border-border bg-card p-4" key={item.id}>
              <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-fg/70">{item.summary}</p>
              <p className="mt-2 text-xs text-fg/60">Gửi lúc: {formatDateLabel(item.created_at)}</p>
              <p className="mt-1 text-xs text-fg/60">
                <ContributorLine item={item} />
              </p>
              <p className="mt-1 text-xs text-fg/60">
                Trạng thái: {SUBMISSION_STATUS_LABEL[item.status]}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg/80 transition hover:border-primary/45 hover:text-fg"
                  onClick={() => setSelectedId(item.id)}
                  type="button"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Chi tiết
                </button>
                {item.status === "pending" ? (
                  <>
                    <button
                      className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-fg disabled:opacity-60"
                      disabled={isProcessing || role !== "admin"}
                      onClick={() => void handleAction(item.id, "approve")}
                      type="button"
                    >
                      Duyệt
                    </button>
                    <button
                      className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                      disabled={isProcessing || role !== "admin"}
                      onClick={() => void handleAction(item.id, "reject")}
                      type="button"
                    >
                      Từ chối
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}

        {items.length === 0 ? <li className="text-sm text-fg/60">Chưa có đề xuất nào.</li> : null}
      </ul>

      {selectedItem ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            aria-label="Đóng chi tiết đề xuất"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setSelectedId(null)}
            type="button"
          />
          <article className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-bg p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                <p className="mt-1 text-xs text-fg/65">
                  <ContributorLine item={selectedItem} />
                </p>
                <p className="mt-1 text-xs text-fg/55">Gửi lúc: {formatDateLabel(selectedItem.created_at)}</p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg/75 transition hover:border-primary/40 hover:text-primary"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <section className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">Tóm tắt đề xuất</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">{selectedItem.summary}</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">Nội dung chi tiết</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                  {stripHtml(selectedItem.content)}
                </p>
              </div>

              {selectedItem.review_note ? (
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">Ghi chú kiểm duyệt</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                    {selectedItem.review_note}
                  </p>
                </div>
              ) : null}
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}