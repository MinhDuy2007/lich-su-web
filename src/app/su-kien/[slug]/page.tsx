import { notFound } from "next/navigation";
import { EventCard } from "@/components/events/event-card";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { SiteShell } from "@/components/layout/site-shell";
import { HistoryTracker } from "@/components/events/history-tracker";
import { PersonalActions } from "@/components/events/personal-actions";
import { getEventBySlug, getRelatedEvents } from "@/lib/events";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    notFound();
  }

  const related = await getRelatedEvents(event.id);
  const admin = createSupabaseAdmin();
  const { data: cachedSummary } = await admin
    .from("ai_summaries_cache")
    .select("summary")
    .eq("event_id", event.id)
    .eq("style", "paragraph")
    .eq("length", "short")
    .maybeSingle();

  return (
    <SiteShell>
      <HistoryTracker eventId={event.id} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-4">
          <header className="card-glass rounded-2xl p-6">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="mt-3 text-sm leading-7 text-fg/75">{event.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"
                  key={tag}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </header>
          <article className="card-glass rounded-2xl p-6 text-sm leading-7 text-fg/80">
            {event.content}
          </article>
        </section>

        <div className="space-y-5">
          <AiAssistantPanel
            eventId={event.id}
            initialSummary={cachedSummary?.summary ?? null}
          />
          <PersonalActions eventId={event.id} />
          <section className="card-glass rounded-2xl p-6">
            <h2 className="mb-3 text-lg font-semibold">Thong tin nhanh</h2>
            <ul className="space-y-2 text-sm text-fg/75">
              <li>Bat dau: {event.startDate ?? "Khong ro"}</li>
              <li>Ket thuc: {event.endDate ?? "Khong ro"}</li>
              <li>Loai: {event.eventType ?? "Khac"}</li>
              <li>Dia diem: {event.locationText ?? "Khong ro"}</li>
            </ul>
          </section>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-10 space-y-5">
          <h2 className="text-2xl font-semibold">Su kien lien quan</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <EventCard event={item} key={item.id} />
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}
