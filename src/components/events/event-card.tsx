import Link from "next/link";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import { formatFlexibleDateRange } from "@/lib/flexible-date";
import type { EventDTO } from "@/types/contracts";

interface EventCardProps {
  event: EventDTO;
}

export function EventCard({ event }: EventCardProps) {
  const timeline = formatFlexibleDateRange(
    {
      day: event.startDay,
      month: event.startMonth,
      year: event.startYear
    },
    {
      day: event.endDay,
      month: event.endMonth,
      year: event.endYear
    },
    {
      startDate: event.startDate,
      endDate: event.endDate
    }
  );

  return (
    <Link className="block h-full" href={`/su-kien/${event.slug}`}>
      <article className="card-glass group flex h-full flex-col rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
        <h3 className="mb-3 line-clamp-2 text-lg font-semibold text-fg transition group-hover:text-primary">
          {event.title}
        </h3>

        <p className="line-clamp-3 text-sm leading-6 text-fg/75">{event.summary}</p>

        <div className="mt-4 space-y-2 text-xs text-fg/65">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <span className="line-clamp-1">{timeline}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="line-clamp-1">{event.locationText ?? "Chưa rõ địa điểm"}</span>
          </p>
          <p className="flex items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-primary" />
            <span className="line-clamp-1">{event.tags.slice(0, 3).join(", ") || "Chưa có thẻ"}</span>
          </p>
        </div>

        <div className="mt-5">
          <span className="inline-flex items-center rounded-xl border border-primary/40 px-3 py-2 text-sm font-semibold text-primary transition group-hover:bg-primary group-hover:text-primary-fg">
            Xem bài viết
          </span>
        </div>
      </article>
    </Link>
  );
}
