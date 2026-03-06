import { SiteShell } from "@/components/layout/site-shell";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("events")
    .select("id, slug, title, start_date, summary, event_type")
    .eq("status", "published")
    .order("start_date", { ascending: true })
    .limit(200);

  const grouped = (data ?? []).reduce<Record<string, typeof data>>((acc, row) => {
    const year = row.start_date ? String(new Date(row.start_date).getFullYear()) : "Không rõ";
    acc[year] = [...(acc[year] ?? []), row];
    return acc;
  }, {});

  return (
    <SiteShell>
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Dong thoi gian su kien</h1>
          <p className="mt-2 text-sm text-fg/70">
            Theo doi su kien theo moc nam. Du lieu cap nhat tu Supabase.
          </p>
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

