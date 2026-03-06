import { notFound } from "next/navigation";
import { EventCard } from "@/components/events/event-card";
import { SiteShell } from "@/components/layout/site-shell";
import { HistoryTracker } from "@/components/events/history-tracker";
import { EventDetailTabs } from "@/components/events/event-detail-tabs";
import { getEventBySlug, getRelatedEvents } from "@/lib/events";
import { sanitizeRichContentHtml } from "@/lib/rich-content";
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
  const safeEvent = {
    ...event,
    content: sanitizeRichContentHtml(event.content)
  };
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
      <EventDetailTabs event={safeEvent} initialSummary={cachedSummary?.summary ?? null} />

      {related.length > 0 ? (
        <section className="mt-10 space-y-5">
          <h2 className="text-2xl font-semibold">Sự kiện liên quan</h2>
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
