import { SiteShell } from "@/components/layout/site-shell";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface TimelineEventRow {
  id: string;
  slug: string;
  title: string;
  start_date: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  summary: string;
  event_type: string | null;
}

function parseDatePartsFromIso(value: string | null) {
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

function resolveStartParts(row: TimelineEventRow) {
  const isoParts = parseDatePartsFromIso(row.start_date);
  return {
    year: row.start_year ?? isoParts.year,
    month: row.start_month ?? isoParts.month,
    day: row.start_day ?? isoParts.day
  };
}

export default async function TimelinePage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("events")
    .select("id, slug, title, start_date, start_year, start_month, start_day, summary, event_type")
    .eq("status", "published")
    .limit(200);

  const rows = ((data ?? []) as TimelineEventRow[]).sort((a, b) => {
    const startA = resolveStartParts(a);
    const startB = resolveStartParts(b);

    const yearA = startA.year ?? Number.POSITIVE_INFINITY;
    const yearB = startB.year ?? Number.POSITIVE_INFINITY;
    if (yearA !== yearB) {
      return yearA - yearB;
    }

    const monthA = startA.month ?? 1;
    const monthB = startB.month ?? 1;
    if (monthA !== monthB) {
      return monthA - monthB;
    }

    const dayA = startA.day ?? 1;
    const dayB = startB.day ?? 1;
    if (dayA !== dayB) {
      return dayA - dayB;
    }

    return a.title.localeCompare(b.title, "vi");
  });

  const grouped = rows.reduce<Record<string, TimelineEventRow[]>>((acc, row) => {
    const start = resolveStartParts(row);
    const yearLabel = start.year ? String(start.year) : "Không rõ";
    acc[yearLabel] = [...(acc[yearLabel] ?? []), row];
    return acc;
  }, {});

  return (
    <SiteShell>
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Dòng thời gian</h1>
        </header>

        <div className="space-y-8">
          {Object.entries(grouped).map(([year, events]) => (
            <div className="relative pl-6" key={year}>
              <div className="absolute left-2 top-1 h-full w-px bg-border" />
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <h2 className="text-xl font-semibold">{year}</h2>
              </div>
              <div className="space-y-3">
                {(events ?? []).map((event) => (
                  <a
                    className="card-glass block rounded-2xl p-4 transition hover:border-primary/40"
                    href={`/su-kien/${event.slug}`}
                    key={event.id}
                  >
                    <p className="text-sm font-semibold text-fg">{event.title}</p>
                    <p className="mt-1 text-xs text-fg/65">{event.summary}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

