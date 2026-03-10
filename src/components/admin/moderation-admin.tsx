"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ModeratorEventItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  slug: string;
  status: "draft" | "pending" | "published" | "rejected";
  created_at: string;
  updated_at: string;
  creator: {
    userId: string;
    username: string;
    displayName: string;
    role: "moderator";
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

const MODERATOR_EVENT_STATUS_LABEL: Record<ModeratorEventItem["status"], string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  published: "Đã xuất bản",
  rejected: "Bị từ chối"
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
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("de-xuat-nguoi-dung");

  const [submissionItems, setSubmissionItems] = useState<SubmissionItem[]>([]);
  const [processingSubmissionIds, setProcessingSubmissionIds] = useState<string[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [moderatorEventItems, setModeratorEventItems] = useState<ModeratorEventItem[]>([]);
  const [processingModeratorEventIds, setProcessingModeratorEventIds] = useState<string[]>([]);
  const [selectedModeratorEventId, setSelectedModeratorEventId] = useState<string | null>(null);

  const loadSubmissionItems = useCallback(async () => {
    const response = await fetch("/api/admin/moderation", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setSubmissionItems(payload.data.items ?? []);
    } else {
      toast.error(payload.message ?? "Không tải được danh sách kiểm duyệt");
    }
  }, []);

  const loadModeratorEventItems = useCallback(async () => {
    if (role !== "admin") {
      setModeratorEventItems([]);
      return;
    }

    const response = await fetch("/api/admin/moderation/moderator-events", {
      cache: "no-store"
    });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setModeratorEventItems(payload.data.items ?? []);
    } else {
      toast.error(payload.message ?? "Không tải được bài viết của kiểm duyệt viên");
    }
  }, [role]);

  useEffect(() => {
    void loadSubmissionItems();
    if (role === "admin") {
      void loadModeratorEventItems();
    }
  }, [role, loadModeratorEventItems, loadSubmissionItems]);

  useEffect(() => {
    if (role !== "admin") {
      return;
    }

    const tabParam = searchParams?.get("tab");
    if (tabParam === "bai-viet-kiem-duyet-vien" || tabParam === "de-xuat-nguoi-dung") {
      setActiveTab(tabParam);
    }
  }, [role, searchParams]);

  async function handleSubmissionAction(submissionId: string, action: "approve" | "reject") {
    if (processingSubmissionIds.includes(submissionId) || role !== "admin") return;

    setProcessingSubmissionIds((prev) => [...prev, submissionId]);
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
      await loadSubmissionItems();
      setSelectedSubmissionId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setProcessingSubmissionIds((prev) => prev.filter((id) => id !== submissionId));
    }
  }

  async function handleModeratorEventAction(eventId: string, action: "approve" | "reject") {
    if (processingModeratorEventIds.includes(eventId) || role !== "admin") return;

    setProcessingModeratorEventIds((prev) => [...prev, eventId]);
    try {
      const response = await fetch("/api/admin/moderation/moderator-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          action
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Xử lý duyệt bài kiểm duyệt viên thất bại");
      }

      toast.success(action === "approve" ? "Đã duyệt bài viết" : "Đã từ chối bài viết");
      await loadModeratorEventItems();
      setSelectedModeratorEventId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setProcessingModeratorEventIds((prev) => prev.filter((id) => id !== eventId));
    }
  }

  const pendingSubmissionCount = useMemo(
    () => submissionItems.filter((item) => item.status === "pending").length,
    [submissionItems]
  );
  const pendingModeratorEventCount = useMemo(
    () => moderatorEventItems.filter((item) => item.status === "pending").length,
    [moderatorEventItems]
  );
  const selectedSubmissionItem = useMemo(
    () => submissionItems.find((item) => item.id === selectedSubmissionId) ?? null,
    [submissionItems, selectedSubmissionId]
  );
  const selectedModeratorEventItem = useMemo(
    () => moderatorEventItems.find((item) => item.id === selectedModeratorEventId) ?? null,
    [moderatorEventItems, selectedModeratorEventId]
  );

  return (
    <section className="card-glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Kiểm duyệt nội dung</h2>
      </div>

      {role !== "admin" ? (
        <p className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-fg/70">
          Tài khoản kiểm duyệt viên chỉ có quyền xem. Quyết định duyệt hoặc từ chối do admin thực
          hiện.
        </p>
      ) : null}

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="de-xuat-nguoi-dung">
            Đề xuất người dùng ({pendingSubmissionCount})
          </TabsTrigger>
          {role === "admin" ? (
            <TabsTrigger value="bai-viet-kiem-duyet-vien">
              Bài viết kiểm duyệt viên ({pendingModeratorEventCount})
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="de-xuat-nguoi-dung">
          <ul className="space-y-3">
            {submissionItems.map((item) => {
              const isProcessing = processingSubmissionIds.includes(item.id);
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
                      onClick={() => setSelectedSubmissionId(item.id)}
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
                          onClick={() => void handleSubmissionAction(item.id, "approve")}
                          type="button"
                        >
                          Duyệt
                        </button>
                        <button
                          className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                          disabled={isProcessing || role !== "admin"}
                          onClick={() => void handleSubmissionAction(item.id, "reject")}
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

            {submissionItems.length === 0 ? (
              <li className="text-sm text-fg/60">Chưa có đề xuất nào.</li>
            ) : null}
          </ul>
        </TabsContent>

        {role === "admin" ? (
          <TabsContent value="bai-viet-kiem-duyet-vien">
            <ul className="space-y-3">
              {moderatorEventItems.map((item) => {
                const isProcessing = processingModeratorEventIds.includes(item.id);
                return (
                  <li className="rounded-xl border border-border bg-card p-4" key={item.id}>
                    <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-fg/70">{item.summary}</p>
                    <p className="mt-2 text-xs text-fg/60">
                      Gửi lúc: {formatDateLabel(item.created_at)}
                    </p>
                    <p className="mt-1 text-xs text-fg/60">
                      Người gửi duyệt: {item.creator?.displayName ?? "Kiểm duyệt viên"}
                      {item.creator?.username ? ` (@${item.creator.username})` : ""}
                      {renderContributorRoleBadge(item.creator?.role)}
                    </p>
                    <p className="mt-1 text-xs text-fg/60">
                      Trạng thái: {MODERATOR_EVENT_STATUS_LABEL[item.status]}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg/80 transition hover:border-primary/45 hover:text-fg"
                        onClick={() => setSelectedModeratorEventId(item.id)}
                        type="button"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Chi tiết
                      </button>
                      {item.status === "pending" ? (
                        <>
                          <button
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-fg disabled:opacity-60"
                            disabled={isProcessing}
                            onClick={() => void handleModeratorEventAction(item.id, "approve")}
                            type="button"
                          >
                            Duyệt
                          </button>
                          <button
                            className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                            disabled={isProcessing}
                            onClick={() => void handleModeratorEventAction(item.id, "reject")}
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

              {moderatorEventItems.length === 0 ? (
                <li className="text-sm text-fg/60">
                  Chưa có bài viết nào từ kiểm duyệt viên cần admin duyệt.
                </li>
              ) : null}
            </ul>
          </TabsContent>
        ) : null}
      </Tabs>

      {selectedSubmissionItem ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            aria-label="Đóng chi tiết đề xuất"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setSelectedSubmissionId(null)}
            type="button"
          />
          <article className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-bg p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedSubmissionItem.title}</h3>
                <p className="mt-1 text-xs text-fg/65">
                  <ContributorLine item={selectedSubmissionItem} />
                </p>
                <p className="mt-1 text-xs text-fg/55">
                  Gửi lúc: {formatDateLabel(selectedSubmissionItem.created_at)}
                </p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg/75 transition hover:border-primary/40 hover:text-primary"
                onClick={() => setSelectedSubmissionId(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <section className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">Tóm tắt đề xuất</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                  {selectedSubmissionItem.summary}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">
                  Nội dung chi tiết
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                  {stripHtml(selectedSubmissionItem.content)}
                </p>
              </div>

              {selectedSubmissionItem.review_note ? (
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">Ghi chú kiểm duyệt</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                    {selectedSubmissionItem.review_note}
                  </p>
                </div>
              ) : null}
            </section>
          </article>
        </div>
      ) : null}

      {selectedModeratorEventItem ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            aria-label="Đóng chi tiết bài viết kiểm duyệt viên"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setSelectedModeratorEventId(null)}
            type="button"
          />
          <article className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-bg p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedModeratorEventItem.title}</h3>
                <p className="mt-1 text-xs text-fg/65">
                  Người gửi duyệt: {selectedModeratorEventItem.creator?.displayName ?? "Kiểm duyệt viên"}
                  {selectedModeratorEventItem.creator?.username
                    ? ` (@${selectedModeratorEventItem.creator.username})`
                    : ""}
                  {renderContributorRoleBadge(selectedModeratorEventItem.creator?.role)}
                </p>
                <p className="mt-1 text-xs text-fg/55">
                  Gửi lúc: {formatDateLabel(selectedModeratorEventItem.created_at)}
                </p>
                <p className="mt-1 text-xs text-fg/55">
                  Trạng thái: {MODERATOR_EVENT_STATUS_LABEL[selectedModeratorEventItem.status]}
                </p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg/75 transition hover:border-primary/40 hover:text-primary"
                onClick={() => setSelectedModeratorEventId(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <section className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">Tóm tắt bài viết</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                  {selectedModeratorEventItem.summary}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg/60">
                  Nội dung chi tiết
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-fg/85">
                  {stripHtml(selectedModeratorEventItem.content)}
                </p>
              </div>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}
