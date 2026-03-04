"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";

type EventStatus = "draft" | "pending" | "published" | "rejected";

interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  event_type: string | null;
  updated_at: string;
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

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface EventFormState {
  title: string;
  summary: string;
  content: string;
  startDate: string;
  endDate: string;
  eventType: string;
  locationText: string;
  country: string;
  status: EventStatus;
  tags: string[];
  sourceIds: string[];
  peopleInput: string;
  placesInput: string;
  imageUrlsInput: string;
}

const EVENT_TYPE_PRESET = [
  "chien-tranh",
  "chinh-tri",
  "khoa-hoc",
  "van-hoa",
  "kinh-te",
  "xa-hoi",
  "khac"
];

const emptyForm: EventFormState = {
  title: "",
  summary: "",
  content: "",
  startDate: "",
  endDate: "",
  eventType: "",
  locationText: "",
  country: "",
  status: "draft",
  tags: [],
  sourceIds: [],
  peopleInput: "",
  placesInput: "",
  imageUrlsInput: ""
};

function parseListInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/g)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

export function EventsAdmin() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const generatedSlug = useMemo(
    () => slugify(form.title).slice(0, 160),
    [form.title]
  );

  const eventTypeOptions = useMemo(() => {
    const collected = new Set(EVENT_TYPE_PRESET);
    events.forEach((event) => {
      if (event.event_type) {
        collected.add(event.event_type);
      }
    });
    return Array.from(collected).sort((a, b) => a.localeCompare(b));
  }, [events]);

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
        throw new Error(eventsPayload.message ?? "Khong tai duoc danh sach su kien");
      }
      if (!tagsRes.ok || !tagsPayload.success) {
        throw new Error(tagsPayload.message ?? "Khong tai duoc danh sach tag");
      }
      if (!sourcesRes.ok || !sourcesPayload.success) {
        throw new Error(sourcesPayload.message ?? "Khong tai duoc danh sach nguon");
      }

      setEvents(eventsPayload.data.items ?? []);
      setTags(tagsPayload.data.items ?? []);
      setSources(sourcesPayload.data.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong tai duoc du lieu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  function toggleTag(name: string) {
    setForm((prev) => {
      const exists = prev.tags.includes(name);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((item) => item !== name) : [...prev.tags, name]
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

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!generatedSlug) {
      toast.error("Khong tao duoc slug tu tieu de. Hay kiem tra lai tieu de.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: generatedSlug,
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content.trim(),
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          eventType: form.eventType || null,
          locationText: form.locationText.trim() || null,
          country: form.country.trim() || null,
          status: form.status,
          tags: form.tags,
          people: parseListInput(form.peopleInput),
          places: parseListInput(form.placesInput),
          sourceIds: form.sourceIds,
          imageUrls: parseListInput(form.imageUrlsInput)
        })
      });
      const payload = (await response.json()) as ApiResponse<{ eventId: string }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Tao su kien that bai");
      }

      toast.success("Da tao su kien");
      setForm(emptyForm);
      await loadDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tao su kien that bai");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeEvent(eventId: string) {
    const accepted = window.confirm("Ban chac chan muon xoa su kien nay?");
    if (!accepted) return;

    setDeletingId(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<{ deleted: boolean }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Xoa su kien that bai");
      }
      toast.success("Da xoa su kien");
      await loadDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xoa su kien that bai");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form className="card-glass rounded-2xl p-5" onSubmit={createEvent}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Tao su kien moi</h2>
            <p className="text-xs text-fg/65">
              Slug duoc tao tu dong. Tag va nguon chon tu danh sach co san.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg/80 transition hover:border-primary/40 hover:text-fg"
            onClick={() => void loadDashboardData()}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tai lai du lieu
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-fg/70">Tieu de</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Nhap tieu de su kien"
              required
              value={form.title}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Slug (tu dong)</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-fg/80"
              readOnly
              value={generatedSlug || "tu-dong-sinh-tu-tieu-de"}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Loai su kien</span>
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, eventType: event.target.value }))
              }
              value={form.eventType}
            >
              <option value="">Khong xac dinh</option>
              {eventTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Trang thai</span>
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as EventStatus
                }))
              }
              value={form.status}
            >
              <option value="draft">draft</option>
              <option value="pending">pending</option>
              <option value="published">published</option>
              <option value="rejected">rejected</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Ngay bat dau</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startDate: event.target.value }))
              }
              type="date"
              value={form.startDate}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Ngay ket thuc</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, endDate: event.target.value }))
              }
              type="date"
              value={form.endDate}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Dia diem</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, locationText: event.target.value }))
              }
              placeholder="Vi du: Ha Noi"
              value={form.locationText}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-fg/70">Quoc gia</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, country: event.target.value }))
              }
              placeholder="Vi du: Viet Nam"
              value={form.country}
            />
          </label>
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-xs text-fg/70">Tom tat</span>
          <textarea
            className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, summary: event.target.value }))
            }
            placeholder="Mo ta ngan ve su kien"
            required
            value={form.summary}
          />
        </label>

        <label className="mt-3 block space-y-1">
          <span className="text-xs text-fg/70">Noi dung chi tiet</span>
          <textarea
            className="h-36 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, content: event.target.value }))
            }
            placeholder="Noi dung day du cua su kien"
            required
            value={form.content}
          />
        </label>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Tag co san</p>
              <Link className="text-xs text-primary underline" href="/admin/tags">
                Them tag moi
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
                <p className="text-xs text-fg/60">Chua co tag. Vao trang Quan ly tag de tao moi.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Nguon co san</p>
              <Link className="text-xs text-primary underline" href="/admin/nguon">
                Them nguon moi
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
                <p className="text-xs text-fg/60">Chua co nguon. Vao trang Quan ly nguon de tao moi.</p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-fg/70">Nhan vat (tach boi dau phay)</span>
            <textarea
              className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, peopleInput: event.target.value }))
              }
              placeholder="Le Loi, Nguyen Trai"
              value={form.peopleInput}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-fg/70">Dia danh (tach boi dau phay)</span>
            <textarea
              className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, placesInput: event.target.value }))
              }
              placeholder="Ha Noi, Hue"
              value={form.placesInput}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-fg/70">URL hinh anh (tach boi dau phay)</span>
            <textarea
              className="h-24 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, imageUrlsInput: event.target.value }))
              }
              placeholder="https://example.com/a.jpg"
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
          {submitting ? "Dang tao..." : "Tao su kien"}
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Danh sach su kien</h2>
          {loading ? <p className="text-xs text-fg/60">Dang tai du lieu...</p> : null}
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
                  {event.slug} | {event.status} | {event.event_type ?? "khac"}
                </p>
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
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                  disabled={deletingId === event.id}
                  onClick={() => void removeEvent(event.id)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === event.id ? "Dang xoa..." : "Xoa"}
                </button>
              </div>
            </li>
          ))}
          {events.length === 0 && !loading ? (
            <li className="text-sm text-fg/65">Chua co su kien nao.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

