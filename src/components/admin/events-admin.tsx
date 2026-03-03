"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  status: string;
  event_type: string | null;
}

const emptyEvent = {
  slug: "",
  title: "",
  summary: "",
  content: "",
  startDate: "",
  endDate: "",
  eventType: "",
  locationText: "",
  country: "",
  status: "draft",
  tags: [] as string[],
  people: [] as string[],
  places: [] as string[],
  sourceIds: [] as string[],
  imageUrls: [] as string[]
};

export function EventsAdmin() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyEvent);

  async function loadEvents() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/events");
      const payload = await response.json();
      if (response.ok && payload.success) {
        setEvents(payload.data.items);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Tao su kien that bai");
      }
      toast.success("Tao su kien thanh cong");
      setForm(emptyEvent);
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    }
  }

  async function removeEvent(eventId: string) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Xoa that bai");
      }
      toast.success("Da xoa su kien");
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi he thong");
    }
  }

  return (
    <div className="space-y-6">
      <form className="card-glass rounded-2xl p-5" onSubmit={createEvent}>
        <h2 className="mb-4 text-lg font-semibold">Tao su kien moi</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Tieu de"
            required
            value={form.title}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Slug"
            required
            value={form.slug}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, eventType: event.target.value }))
            }
            placeholder="Loai su kien"
            value={form.eventType}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, locationText: event.target.value }))
            }
            placeholder="Dia diem"
            value={form.locationText}
          />
          <input
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            type="date"
            value={form.startDate}
          />
          <select
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            value={form.status}
          >
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="published">published</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <textarea
          className="mt-3 h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
          onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
          placeholder="Mo ta ngan"
          required
          value={form.summary}
        />
        <textarea
          className="mt-3 h-32 w-full rounded-xl border border-border bg-card p-3 text-sm"
          onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          placeholder="Noi dung day du"
          required
          value={form.content}
        />
        <button
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
          type="submit"
        >
          Tao su kien
        </button>
      </form>

      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-4 text-lg font-semibold">Danh sach su kien</h2>
        {loading ? <p className="text-sm text-fg/65">Dang tai...</p> : null}
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
              <button
                className="rounded-lg border border-red-400 px-3 py-1 text-xs font-semibold text-red-500"
                onClick={() => void removeEvent(event.id)}
                type="button"
              >
                Xoa
              </button>
            </li>
          ))}
          {events.length === 0 ? (
            <li className="text-sm text-fg/65">Chua co su kien nao.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

