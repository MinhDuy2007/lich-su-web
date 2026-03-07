import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { loadLatestRoleByUserIds } from "@/lib/user-ip-log";
import type { EventDTO, EventSearchQuery } from "@/types/contracts";

interface EventViewRow {
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
  start_precision:
    | "unknown"
    | "year"
    | "month"
    | "day"
    | "month_year"
    | "day_month"
    | "day_year"
    | "day_month_year";
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  end_precision:
    | "unknown"
    | "year"
    | "month"
    | "day"
    | "month_year"
    | "day_month"
    | "day_year"
    | "day_month_year";
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

interface TagRow {
  id: string;
  name: string;
  slug: string;
}

function mapToEventDTO(
  row: EventViewRow,
  contributor?: {
    displayName: string | null;
    username: string | null;
    role: "user" | "moderator" | "admin" | null;
  }
): EventDTO {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    startDate: row.start_date,
    endDate: row.end_date,
    startYear: row.start_year,
    startMonth: row.start_month,
    startDay: row.start_day,
    startPrecision: row.start_precision ?? "unknown",
    endYear: row.end_year,
    endMonth: row.end_month,
    endDay: row.end_day,
    endPrecision: row.end_precision ?? "unknown",
    eventType: row.event_type,
    locationText: row.location_text,
    country: row.country,
    status: row.status,
    tags: row.tags ?? [],
    people: row.people ?? [],
    places: row.places ?? [],
    contributorDisplayName: contributor?.displayName ?? null,
    contributorUsername: contributor?.username ?? null,
    contributorRole: contributor?.role ?? null,
    imageUrls: row.image_urls ?? [],
    sources: row.sources ?? []
  };
}

async function fetchContributorMap(admin: ReturnType<typeof createSupabaseAdmin>, eventIds: string[]) {
  const contributorByEvent = new Map<
    string,
    {
      displayName: string | null;
      username: string | null;
      role: "user" | "moderator" | "admin" | null;
    }
  >();

  if (eventIds.length === 0) {
    return contributorByEvent;
  }

  const contributorUserByEvent = new Map<string, string>();

  const submissionResult = await admin
    .from("event_submissions")
    .select("approved_event_id,submitted_by,created_at")
    .in("approved_event_id", eventIds)
    .order("created_at", { ascending: false });

  if (!submissionResult.error) {
    for (const row of submissionResult.data ?? []) {
      if (!row.approved_event_id || !row.submitted_by) {
        continue;
      }
      if (!contributorUserByEvent.has(row.approved_event_id)) {
        contributorUserByEvent.set(row.approved_event_id, row.submitted_by);
      }
    }
  }

  const missingEventIds = eventIds.filter((eventId) => !contributorUserByEvent.has(eventId));
  if (missingEventIds.length > 0) {
    const creatorResult = await admin
      .from("events")
      .select("id,created_by")
      .in("id", missingEventIds);

    if (!creatorResult.error) {
      for (const row of creatorResult.data ?? []) {
        if (!row.id || !row.created_by) {
          continue;
        }
        contributorUserByEvent.set(row.id, row.created_by);
      }
    }
  }

  const contributorUserIds = Array.from(new Set(Array.from(contributorUserByEvent.values())));
  if (contributorUserIds.length === 0) {
    return contributorByEvent;
  }

  const profileResult = await admin
    .from("profiles")
    .select("user_id,display_name,username")
    .in("user_id", contributorUserIds);

  const profileMap = new Map<string, { displayName: string | null; username: string | null }>();
  if (!profileResult.error) {
    (profileResult.data ?? []).forEach((profile) => {
      profileMap.set(profile.user_id, {
        displayName: profile.display_name || profile.username || null,
        username: profile.username ?? null
      });
    });
  }

  let roleByUserId = new Map<string, "user" | "moderator" | "admin">();
  try {
    roleByUserId = await loadLatestRoleByUserIds(contributorUserIds);
  } catch {
    roleByUserId = new Map<string, "user" | "moderator" | "admin">();
  }

  contributorUserByEvent.forEach((userId, eventId) => {
    const profile = profileMap.get(userId);
    contributorByEvent.set(eventId, {
      displayName: profile?.displayName ?? profile?.username ?? "Người dùng",
      username: profile?.username ?? null,
      role: roleByUserId.get(userId) ?? null
    });
  });

  return contributorByEvent;
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
    .eq("status", "published")
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

  const rows = (data ?? []) as EventViewRow[];
  const contributorMap = await fetchContributorMap(
    admin,
    rows.map((row) => row.id)
  );

  return {
    items: rows.map((row) => mapToEventDTO(row, contributorMap.get(row.id))),
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
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  const row = data as EventViewRow;
  const contributorMap = await fetchContributorMap(admin, [row.id]);
  return mapToEventDTO(row, contributorMap.get(row.id));
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
    .eq("status", "published")
    .in("id", ids);
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as EventViewRow[];
  const contributorMap = await fetchContributorMap(
    admin,
    rows.map((row) => row.id)
  );

  return rows.map((row) => mapToEventDTO(row, contributorMap.get(row.id)));
}

export async function getSearchTags() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("tags")
    .select("id,name,slug")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TagRow[];
}
