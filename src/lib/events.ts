import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { EventDTO, EventSearchQuery } from "@/types/contracts";

interface EventViewRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  start_date: string | null;
  end_date: string | null;
  event_type: string | null;
  location_text: string | null;
  country: string | null;
  status: "draft" | "pending" | "published" | "rejected";
  tags?: string[] | null;
  people?: string[] | null;
  places?: string[] | null;
  image_urls?: string[] | null;
  sources?: Array<{
    id: string;
    name: string;
    url: string | null;
  }> | null;
}

function mapToEventDTO(row: EventViewRow): EventDTO {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    startDate: row.start_date,
    endDate: row.end_date,
    eventType: row.event_type,
    locationText: row.location_text,
    country: row.country,
    status: row.status,
    tags: row.tags ?? [],
    people: row.people ?? [],
    places: row.places ?? [],
    imageUrls: row.image_urls ?? [],
    sources: row.sources ?? []
  };
}

export async function searchEvents(query: EventSearchQuery) {
  const admin = createSupabaseAdmin();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = admin
    .from("events_view")
    .select("*", { count: "exact" })
    .order("start_date", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (query.query) {
    builder = builder.or(
      `title.ilike.%${query.query}%,summary.ilike.%${query.query}%,content.ilike.%${query.query}%`
    );
  }
  if (query.eventType) {
    builder = builder.eq("event_type", query.eventType);
  }
  if (query.fromDate) {
    builder = builder.gte("start_date", query.fromDate);
  }
  if (query.toDate) {
    builder = builder.lte("start_date", query.toDate);
  }
  if (query.tag) {
    builder = builder.contains("tags", [query.tag]);
  }
  if (query.person) {
    builder = builder.contains("people", [query.person]);
  }
  if (query.place) {
    builder = builder.contains("places", [query.place]);
  }

  const { data, count, error } = await builder;
  if (error) {
    throw error;
  }

  return {
    items: ((data ?? []) as EventViewRow[]).map(mapToEventDTO),
    total: count ?? 0,
    page,
    pageSize
  };
}

export async function getEventBySlug(slug: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events_view")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  return mapToEventDTO(data as EventViewRow);
}

export async function getRelatedEvents(eventId: string) {
  const admin = createSupabaseAdmin();
  const { data: relationRows, error: relationError } = await admin
    .from("event_relations")
    .select("related_event_id")
    .eq("event_id", eventId)
    .limit(6);

  if (relationError) {
    throw relationError;
  }
  const ids = relationRows?.map((row) => row.related_event_id) ?? [];
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("events_view")
    .select("*")
    .in("id", ids);
  if (error) {
    throw error;
  }

  return ((data ?? []) as EventViewRow[]).map(mapToEventDTO);
}
