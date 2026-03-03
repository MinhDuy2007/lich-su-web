import Link from "next/link";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import type { EventDTO } from "@/types/contracts";

interface EventCardProps {
  event: EventDTO;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="card-glass group rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-lg font-semibold text-fg">{event.title}</h3>
        <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
          {event.status}
        </span>
      </div>
      <p className="line-clamp-3 text-sm leading-6 text-fg/75">{event.summary}</p>
      <div className="mt-4 space-y-2 text-xs text-fg/65">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          {event.startDate ?? "Chua ro moc thoi gian"}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {event.locationText ?? "Khong ro dia diem"}
        </p>
        <p className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          {event.tags.slice(0, 3).join(", ") || "Khong co tag"}
        </p>
      </div>
      <div className="mt-5">
        <Link
          className="inline-flex items-center rounded-xl border border-primary/40 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-fg"
          href={`/su-kien/${event.slug}`}
        >
          Xem chi tiet
        </Link>
      </div>
    </article>
  );
}

