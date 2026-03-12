"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { RichEventEditor } from "@/components/admin/rich-event-editor";
import { FlexibleDateFields } from "@/components/forms/flexible-date-fields";
import { useConfirmPopup } from "@/components/ui/confirm-popup";
import { cn } from "@/lib/cn";
import {
  emptyEventEditorFormState,
  type EventEditorFormState,
  parseCustomSourcesInput,
  parseListInput,
  stripHtml
} from "@/lib/event-editor";
import { extractImageUrlsFromHtml } from "@/lib/rich-content";
import { slugify } from "@/lib/slug";

type EventStatus = "draft" | "pending" | "published" | "rejected";
type StaffRole = "admin" | "moderator";

interface EventsAdminProps {
  role: StaffRole;
}

interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  event_type: string | null;
  updated_at: string;
  contributor_display_name?: string | null;
  contributor_username?: string | null;
  contributor_role?: "user" | "moderator" | "admin" | null;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

interface SourceItem {
  id: string;
  name: string;
  url: string | null;
}

interface EventSourceRef {
  id: string;
  name: string;
  url: string | null;
}

interface AdminEventDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  start_date: string | null;
  end_date: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  event_type: string | null;
  location_text: string | null;
  country: string | null;
  status: EventStatus;
  tags?: string[] | null;
  people?: string[] | null;
  places?: string[] | null;
  image_urls?: string[] | null;
  sources?: EventSourceRef[] | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  published: "Đã xuất bản",
  rejected: "Bị từ chối"
};

const CONTRIBUTOR_ROLE_LABEL: Record<"moderator" | "admin", string> = {
  moderator: "Moderator",
  admin: "Admin"
};

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

function createEmptyFormState(): EventEditorFormState {
  return {
    ...emptyEventEditorFormState,
    startDate: { ...emptyEventEditorFormState.startDate },
    endDate: { ...emptyEventEditorFormState.endDate }
  };
}

function toDraft(value: number | null | undefined, padLength?: number) {
  if (!value) {
    return "";
  }

  return padLength ? String(value).padStart(padLength, "0") : String(value);
}

function parseIsoDateParts(value: string | null | undefined) {
  if (!value) {
    return {
      year: null,
      month: null,
      day: null
    };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) {
    return {
      year: null,
      month: null,
      day: null
    };
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10)
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function defaultStatusHint(role: StaffRole) {
  return role === "admin"
    ? "Bài viết tạo mới mặc định ở trạng thái Đã xuất bản."
    : "Bài viết tạo mới mặc định ở trạng thái Chờ duyệt.";
}

export function EventsAdmin({ role }: EventsAdminProps) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [form, setForm] = useState<EventEditorFormState>(createEmptyFormState);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<EventStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const { confirm, confirmPopup } = useConfirmPopup();

  const generatedSlug = useMemo(() => slugify(form.title).slice(0, 160), [form.title]);
  const isEditing = Boolean(editingEventId);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [eventsRes, tagsRes, sourcesRes] = await Promise.all([
        fetch("/api/admin/events", { cache: "no-store" }),
        fetch("/api/admin/tags", { cache: "no-store" }),
        fetch("/api/admin/sources", { cache: "no-store" })
      ]);

      const [eventsPayload, tagsPayload, sourcesPayload] = (await Promise.all([
        eventsRes.json(),
        tagsRes.json(),
        sourcesRes.json()
      ])) as [
        ApiResponse<{ items: AdminEvent[] }>,
        ApiResponse<{ items: TagItem[] }>,
        ApiResponse<{ items: SourceItem[] }>
      ];

      if (!eventsRes.ok || !eventsPayload.success) {
        throw new Error(eventsPayload.message ?? "Không tải được danh sách sự kiện");
      }
      if (!tagsRes.ok || !tagsPayload.success) {
        throw new Error(tagsPayload.message ?? "Không tải được danh sách thẻ");
      }
      if (!sourcesRes.ok || !sourcesPayload.success) {
        throw new Error(sourcesPayload.message ?? "Không tải được danh sách nguồn");
      }

      setEvents(eventsPayload.data.items ?? []);
      setTags(tagsPayload.data.items ?? []);
      setSources(sourcesPayload.data.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  function resetForm() {
    setForm(createEmptyFormState());
    setEditingEventId(null);
    setEditingStatus(null);
  }

  function toggleTag(name: string) {
    setForm((prev) => {
      const exists = prev.tags.includes(name);
      const nextTags = exists ? prev.tags.filter((item) => item !== name) : [...prev.tags, name];
      const nextEventType =
        prev.eventType && nextTags.includes(prev.eventType) ? prev.eventType : (nextTags[0] ?? "");
      return {
        ...prev,
        tags: nextTags,
        eventType: nextEventType
      };
    });
  }

  function toggleSource(sourceId: string) {
    setForm((prev) => {
      const exists = prev.sourceIds.includes(sourceId);
      return {
        ...prev,
        sourceIds: exists
          ? prev.sourceIds.filter((item) => item !== sourceId)
          : [...prev.sourceIds, sourceId]
      };
    });
  }

  async function startEdit(eventId: string) {
    setLoadingEditId(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as ApiResponse<AdminEventDetail>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Không tải được dữ liệu sự kiện để chỉnh sửa");
      }

      const detail = payload.data;
      const fallbackStartDate = parseIsoDateParts(detail.start_date);
      const fallbackEndDate = parseIsoDateParts(detail.end_date);
      setEditingEventId(detail.id);
      setEditingStatus(detail.status ?? null);
      setForm({
        title: detail.title ?? "",
        summary: detail.summary ?? "",
        content: detail.content ?? "",
        startDate: {
          day: toDraft(detail.start_day ?? fallbackStartDate.day, 2),
          month: toDraft(detail.start_month ?? fallbackStartDate.month, 2),
          year: toDraft(detail.start_year ?? fallbackStartDate.year)
        },
        endDate: {
          day: toDraft(detail.end_day ?? fallbackEndDate.day, 2),
          month: toDraft(detail.end_month ?? fallbackEndDate.month, 2),
          year: toDraft(detail.end_year ?? fallbackEndDate.year)
        },
        eventType: detail.event_type ?? "",
        locationText: detail.location_text ?? "",
        country: detail.country ?? "",
        tags: detail.tags ?? [],
        sourceIds: (detail.sources ?? []).map((source) => source.id),
        customSourcesInput: "",
        peopleInput: (detail.people ?? []).join(", "),
        placesInput: (detail.places ?? []).join(", "),
        imageUrlsInput: (detail.image_urls ?? []).join("\n")
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở chế độ chỉnh sửa");
    } finally {
      setLoadingEditId(null);
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!generatedSlug) {
      toast.error("Không tạo được đường dẫn từ tiêu đề. Vui lòng kiểm tra lại tiêu đề.");
      return;
    }

    const textOnlyContent = stripHtml(form.content);
    if (!textOnlyContent || textOnlyContent.length < 10) {
      toast.error("Nội dung sự kiện quá ngắn. Vui lòng bổ sung chi tiết.");
      return;
    }

    const extraImageUrls = parseListInput(form.imageUrlsInput);
    const customSourcesResult = parseCustomSourcesInput(form.customSourcesInput);
    if (customSourcesResult.errors.length > 0) {
      toast.error(customSourcesResult.errors[0]);
      return;
    }

    const embeddedImageUrls = extractImageUrlsFromHtml(form.content);
    const imageUrls = Array.from(new Set([...extraImageUrls, ...embeddedImageUrls]));

    setSubmitting(true);
    try {
      const endpoint = editingEventId
        ? `/api/admin/events/${editingEventId}`
        : "/api/admin/events";
      const method = editingEventId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: generatedSlug,
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content,
          startDay: form.startDate.day || null,
          startMonth: form.startDate.month || null,
          startYear: form.startDate.year || null,
          endDay: form.endDate.day || null,
          endMonth: form.endDate.month || null,
          endYear: form.endDate.year || null,
          eventType: form.eventType || null,
          locationText: form.locationText.trim() || null,
          country: form.country.trim() || null,
          tags: form.tags,
          people: parseListInput(form.peopleInput),
          places: parseListInput(form.placesInput),
          sourceIds: form.sourceIds,
          customSources: customSourcesResult.items,
          imageUrls
        })
      });

      const payload = (await response.json()) as ApiResponse<{ eventId?: string; updated?: boolean }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Lưu sự kiện thất bại");
      }

      const updatedEventId = editingEventId;
      toast.success(updatedEventId ? "Đã cập nhật sự kiện" : "Đã tạo sự kiện mới");
      await loadDashboardData();
      if (updatedEventId) {
        await startEdit(updatedEventId);
      } else {
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu sự kiện thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeEvent(eventId: string) {
    const accepted = await confirm({
      title: "Xóa sự kiện",
      message: "Bạn chắc chắn muốn xóa sự kiện này?",
      confirmLabel: "Xóa",
      destructive: true
    });
    if (!accepted) return;

    setDeletingId(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<{ deleted: boolean }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Xóa sự kiện thất bại");
      }

      toast.success("Đã xóa sự kiện");
      if (editingEventId === eventId) {
        resetForm();
      }
      await loadDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xóa sự kiện thất bại");
    } finally {
      setDeletingId(null);
    }
  }

  async function publishEvent(eventId: string) {
    if (role !== "admin") {
      return;
    }

    const accepted = await confirm({
      title: "Xuất bản sự kiện",
      message: "Sự kiện sẽ hiển thị công khai ngay sau khi xuất bản. Tiếp tục?",
      confirmLabel: "Xuất bản"
    });
    if (!accepted) {
      return;
    }

    setPublishingId(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: "POST"
      });
      const payload = (await response.json()) as ApiResponse<{
        updated?: boolean;
        alreadyPublished?: boolean;
      }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Xuất bản sự kiện thất bại");
      }

      toast.success(
        payload.data?.alreadyPublished ? "Sự kiện đã ở trạng thái xuất bản" : "Đã xuất bản sự kiện"
      );
      await loadDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xuất bản sự kiện thất bại");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {confirmPopup}

      <form className="card-glass rounded-2xl p-5" onSubmit={saveEvent}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
            </h2>
            <p className="text-xs text-fg/65">
              Trình soạn thảo hỗ trợ heading, định dạng chữ, danh sách, trích dẫn, ảnh, gallery và
              bố cục 2 cột.
            </p>
            <p className="mt-1 text-xs text-fg/55">
              {isEditing && editingStatus
                ? `Trạng thái hiện tại: ${STATUS_LABELS[editingStatus]}`
                : defaultStatusHint(role)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg/80 transition hover:border-primary/40 hover:text-fg"
                onClick={resetForm}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
                Hủy chỉnh sửa
              </button>
            ) : null}
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg/80 transition hover:border-primary/40 hover:text-fg"
              onClick={() => void loadDashboardData()}
              type="button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tải lại dữ liệu
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-fg/70">Tiêu đề</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Nhập tiêu đề sự kiện"
              required
              value={form.title}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Đường dẫn (tự động)</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-fg/80"
              readOnly
              value={generatedSlug || "tu-dong-sinh-tu-tieu-de"}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Địa điểm</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, locationText: event.target.value }))
              }
              placeholder="Ví dụ: Hà Nội"
              value={form.locationText}
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-fg/70">Quốc gia</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              placeholder="Ví dụ: Việt Nam"
              value={form.country}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <FlexibleDateFields
            label="Mốc bắt đầu"
            onChange={(nextValue) => setForm((prev) => ({ ...prev, startDate: nextValue }))}
            value={form.startDate}
          />
          <FlexibleDateFields
            label="Mốc kết thúc"
            onChange={(nextValue) => setForm((prev) => ({ ...prev, endDate: nextValue }))}
            value={form.endDate}
          />
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-xs text-fg/70">Tóm tắt ngắn</span>
          <textarea
            className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
            placeholder="Mô tả ngắn để người dùng nắm nhanh nội dung"
            required
            value={form.summary}
          />
        </label>

        <div className="mt-3 space-y-1">
          <span className="text-xs text-fg/70">Nội dung chi tiết</span>
          <RichEventEditor
            onChange={(nextValue) => setForm((prev) => ({ ...prev, content: nextValue }))}
            value={form.content}
          />
          <p className="text-xs text-fg/60">
            Mẹo: kéo thả ảnh trực tiếp vào vùng soạn thảo hoặc bấm nút tải ảnh trên thanh công cụ.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Thẻ đồng bộ</p>
              <Link className="text-xs text-primary underline" href="/admin/tags">
                Quản lý thẻ
              </Link>
            </div>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
              {tags.map((tag) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    form.tags.includes(tag.name)
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border bg-bg text-fg/75 hover:border-primary/45"
                  )}
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  type="button"
                >
                  #{tag.name}
                </button>
              ))}
              {tags.length === 0 ? (
                <p className="text-xs text-fg/60">Chưa có thẻ. Vào trang quản lý thẻ để tạo mới.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Nguồn có sẵn</p>
              <Link className="text-xs text-primary underline" href="/admin/nguon">
                Quản lý nguồn
              </Link>
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {sources.map((source) => (
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-xl border px-2 py-2 text-xs transition",
                    form.sourceIds.includes(source.id)
                      ? "border-primary bg-primary/10"
                      : "border-border bg-bg/60 hover:border-primary/45"
                  )}
                  key={source.id}
                >
                  <input
                    checked={form.sourceIds.includes(source.id)}
                    className="mt-0.5 h-3.5 w-3.5"
                    onChange={() => toggleSource(source.id)}
                    type="checkbox"
                  />
                  <span className="flex-1">
                    <span className="block font-medium">{source.name}</span>
                    {source.url ? (
                      <span className="break-all text-[11px] text-fg/60">{source.url}</span>
                    ) : null}
                  </span>
                </label>
              ))}
              {sources.length === 0 ? (
                <p className="text-xs text-fg/60">
                  Chưa có nguồn. Vào trang quản lý nguồn để tạo mới.
                </p>
              ) : null}
            </div>

            <label className="mt-2 block space-y-1">
              <span className="text-xs text-fg/70">
                Nguồn tùy chỉnh (mỗi dòng: Tên nguồn | https://...)
              </span>
              <textarea
                className="h-24 w-full rounded-xl border border-border bg-bg p-3 text-xs"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customSourcesInput: event.target.value }))
                }
                placeholder={
                  "Ví dụ:\\nWikipedia | https://vi.wikipedia.org/...\\nBáo Nhân Dân | https://nhandan.vn/..."
                }
                value={form.customSourcesInput}
              />
            </label>
          </section>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-fg/70">Nhân vật (tách bởi dấu phẩy)</span>
            <textarea
              className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, peopleInput: event.target.value }))}
              placeholder="Lê Lợi, Nguyễn Trãi"
              value={form.peopleInput}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Địa danh (tách bởi dấu phẩy)</span>
            <textarea
              className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, placesInput: event.target.value }))}
              placeholder="Hà Nội, Huế"
              value={form.placesInput}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">URL ảnh bổ sung</span>
            <textarea
              className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, imageUrlsInput: event.target.value }))
              }
              placeholder="Mỗi dòng một URL ảnh"
              value={form.imageUrlsInput}
            />
          </label>
        </div>

        <button
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-105 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          <Plus className="h-4 w-4" />
          {submitting
            ? isEditing
              ? "Đang cập nhật..."
              : "Đang tạo..."
            : isEditing
              ? "Cập nhật sự kiện"
              : "Tạo sự kiện"}
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Danh sách sự kiện</h2>
          {loading ? <p className="text-xs text-fg/60">Đang tải dữ liệu...</p> : null}
        </div>
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              key={event.id}
            >
              <div>
                <p className="text-sm font-semibold">{event.title}</p>
                <p className="text-xs text-fg/65">
                  {event.slug} | {STATUS_LABELS[event.status]} | {event.event_type ?? "khác"}
                </p>
                {event.contributor_display_name ? (
                  <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-fg/55">
                    Người đóng góp: {event.contributor_display_name}
                    {event.contributor_username ? ` (@${event.contributor_username})` : ""}
                    {renderContributorRoleBadge(event.contributor_role)}
                  </p>
                ) : null}
                <p className="text-xs text-fg/55">Cập nhật: {formatDateTime(event.updated_at)}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg/80 transition hover:border-primary/45 hover:text-fg"
                  href={`/su-kien/${event.slug}`}
                  target="_blank"
                >
                  Xem
                </Link>
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg/80 transition hover:border-primary/45 hover:text-fg disabled:opacity-60"
                  disabled={loadingEditId === event.id}
                  onClick={() => void startEdit(event.id)}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {loadingEditId === event.id ? "Đang mở..." : "Sửa"}
                </button>
                {role === "admin" && event.status === "draft" ? (
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-500 disabled:opacity-60"
                    disabled={publishingId === event.id}
                    onClick={() => void publishEvent(event.id)}
                    type="button"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {publishingId === event.id ? "Đang xuất bản..." : "Xuất bản"}
                  </button>
                ) : null}
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                  disabled={deletingId === event.id}
                  onClick={() => void removeEvent(event.id)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === event.id ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </li>
          ))}
          {events.length === 0 && !loading ? (
            <li className="text-sm text-fg/65">Chưa có sự kiện nào.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
