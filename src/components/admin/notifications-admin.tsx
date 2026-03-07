"use client";

import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

interface ReportItem {
  id: string;
  reason: string;
  detail: string | null;
  status: "pending" | "reviewing" | "resolved" | "rejected";
  adminResponse: string | null;
  changesApplied?: string | null;
  reviewedAt: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
  };
  reporter: {
    userId: string;
    username: string;
    displayName: string;
  };
}

interface SupportRequestItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  message: string;
  createdAt: string;
  submittedBy: string | null;
}

interface NotificationsAdminProps {
  role: "admin" | "moderator";
}

function formatDateTime(value: string) {
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

export function NotificationsAdmin({ role }: NotificationsAdminProps) {
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [changesApplied, setChangesApplied] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ReportItem["status"]>>({});
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const [supportRequests, setSupportRequests] = useState<SupportRequestItem[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(true);

  async function loadReports() {
    setLoadingReports(true);
    try {
      const response = await fetch("/api/admin/reports", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không tải được báo cáo");
      }

      const nextItems = (payload.data.items ?? []) as ReportItem[];
      setReports(nextItems);
      setStatuses(
        nextItems.reduce<Record<string, ReportItem["status"]>>((acc, item) => {
          acc[item.id] = item.status;
          return acc;
        }, {})
      );
      setResponses(
        nextItems.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.adminResponse ?? "";
          return acc;
        }, {})
      );
      setChangesApplied(
        nextItems.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.changesApplied ?? "";
          return acc;
        }, {})
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoadingReports(false);
    }
  }

  async function loadSupportRequests() {
    setLoadingSupport(true);
    try {
      const response = await fetch("/api/admin/support-requests", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không tải được yêu cầu hỗ trợ");
      }

      setSupportRequests((payload.data.items ?? []) as SupportRequestItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoadingSupport(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadReports(), loadSupportRequests()]);
  }, []);

  async function sendBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung thông báo");
      return;
    }

    setSendingBroadcast(true);
    try {
      const response = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          link: broadcastLink.trim() || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không gửi được thông báo");
      }

      toast.success(`Đã gửi thông báo đến ${payload.data.sent ?? 0} tài khoản`);
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastLink("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function reviewReport(reportId: string) {
    if (role !== "admin") {
      toast.error("Chỉ admin mới được phản hồi báo cáo.");
      return;
    }
    if (updatingIds.includes(reportId)) return;

    const responseText = responses[reportId]?.trim();
    if (!responseText) {
      toast.error("Vui lòng nhập phản hồi trước khi cập nhật");
      return;
    }

    const status = statuses[reportId] ?? "reviewing";
    setUpdatingIds((prev) => [...prev, reportId]);
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status,
          response: responseText,
          changesApplied: changesApplied[reportId]?.trim() || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Không cập nhật được báo cáo");
      }

      toast.success("Đã cập nhật phản hồi báo cáo");
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== reportId));
    }
  }

  return (
    <div className="space-y-6">
      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Gửi thông báo đến toàn bộ tài khoản</h2>
        <form className="space-y-3" onSubmit={sendBroadcast}>
          <input
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 focus:ring-2"
            onChange={(event) => setBroadcastTitle(event.target.value)}
            placeholder="Tiêu đề thông báo"
            value={broadcastTitle}
          />
          <textarea
            className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none ring-primary/30 focus:ring-2"
            onChange={(event) => setBroadcastBody(event.target.value)}
            placeholder="Nội dung gửi đến toàn bộ tài khoản"
            value={broadcastBody}
          />
          <input
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-primary/30 focus:ring-2"
            onChange={(event) => setBroadcastLink(event.target.value)}
            placeholder="Liên kết đi kèm (tuỳ chọn), ví dụ: /thu-vien"
            value={broadcastLink}
          />
          <div className="flex justify-end">
            <button
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
              disabled={sendingBroadcast}
              type="submit"
            >
              {sendingBroadcast ? "Đang gửi..." : "Gửi thông báo"}
            </button>
          </div>
        </form>
      </section>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Yêu cầu hỗ trợ</h2>
        {loadingSupport ? <p className="text-sm text-fg/65">Đang tải yêu cầu hỗ trợ...</p> : null}
        {!loadingSupport && supportRequests.length === 0 ? (
          <p className="text-sm text-fg/65">Chưa có yêu cầu hỗ trợ mới.</p>
        ) : null}

        <div className="space-y-3">
          {supportRequests.map((item) => (
            <article className="rounded-xl border border-border bg-card p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{item.fullName}</p>
                <p className="text-xs text-fg/55">{formatDateTime(item.createdAt)}</p>
              </div>
              <p className="mt-1 text-xs text-fg/65">{item.email}</p>
              {item.phone ? <p className="mt-1 text-xs text-fg/65">SĐT: {item.phone}</p> : null}
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-fg/85">
                {item.message}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Báo cáo bài viết</h2>
        {role !== "admin" ? (
          <p className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-fg/70">
            Kiểm duyệt viên chỉ xem báo cáo. Chỉ admin có quyền phản hồi và cập nhật trạng thái.
          </p>
        ) : null}
        {loadingReports ? <p className="text-sm text-fg/65">Đang tải báo cáo...</p> : null}
        {!loadingReports && reports.length === 0 ? (
          <p className="text-sm text-fg/65">Chưa có báo cáo mới.</p>
        ) : null}

        <div className="space-y-3">
          {reports.map((report) => (
            <article className="rounded-xl border border-border bg-card p-4" key={report.id}>
              <p className="text-sm font-semibold">{report.event.title}</p>
              <p className="mt-1 text-xs text-fg/65">
                Người gửi: {report.reporter.displayName} (@{report.reporter.username})
              </p>
              <p className="mt-2 text-sm text-fg/85">
                <span className="font-semibold">Lý do:</span> {report.reason}
              </p>
              {report.detail ? (
                <p className="mt-1 text-sm text-fg/80">
                  <span className="font-semibold">Chi tiết:</span> {report.detail}
                </p>
              ) : null}

              <div className="mt-3 grid gap-2 lg:grid-cols-[180px_1fr]">
                <select
                  className="h-10 rounded-xl border border-border bg-bg px-2 text-xs"
                  disabled={role !== "admin"}
                  onChange={(event) =>
                    setStatuses((prev) => ({
                      ...prev,
                      [report.id]: event.target.value as ReportItem["status"]
                    }))
                  }
                  value={statuses[report.id] ?? report.status}
                >
                  <option value="reviewing">Đang xử lý</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="rejected">Từ chối báo cáo</option>
                </select>

                <input
                  className="h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none ring-primary/30 focus:ring-2"
                  disabled={role !== "admin"}
                  onChange={(event) =>
                    setResponses((prev) => ({
                      ...prev,
                      [report.id]: event.target.value
                    }))
                  }
                  placeholder="Nhập phản hồi gửi lại cho người báo cáo"
                  value={responses[report.id] ?? ""}
                />
              </div>

              <textarea
                className="mt-2 h-24 w-full rounded-xl border border-border bg-bg p-3 text-sm outline-none ring-primary/30 focus:ring-2"
                disabled={role !== "admin"}
                onChange={(event) =>
                  setChangesApplied((prev) => ({
                    ...prev,
                    [report.id]: event.target.value
                  }))
                }
                placeholder="Mô tả thay đổi đã thực hiện trên bài viết (nếu có)"
                value={changesApplied[report.id] ?? ""}
              />

              <div className="mt-3 flex justify-end">
                <button
                  className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg disabled:opacity-60"
                  disabled={updatingIds.includes(report.id) || role !== "admin"}
                  onClick={() => void reviewReport(report.id)}
                  type="button"
                >
                  Cập nhật phản hồi
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
