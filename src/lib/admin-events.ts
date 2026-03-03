import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface EventRelationPayload {
  eventId: string;
  tags: string[];
  people: string[];
  places: string[];
  sourceIds: string[];
  imageUrls: string[];
}

export async function syncEventRelations(payload: EventRelationPayload) {
  const admin = createSupabaseAdmin();

  await Promise.all([
    admin.from("event_tags").delete().eq("event_id", payload.eventId),
    admin.from("event_people").delete().eq("event_id", payload.eventId),
    admin.from("event_places").delete().eq("event_id", payload.eventId),
    admin.from("event_sources").delete().eq("event_id", payload.eventId),
    admin.from("event_images").delete().eq("event_id", payload.eventId)
  ]);

  if (payload.tags.length > 0) {
    const { data: tagRows } = await admin
      .from("tags")
      .select("id,name")
      .in("name", payload.tags);
    const existingNames = new Set((tagRows ?? []).map((row) => row.name));
    const missingNames = payload.tags.filter((tag) => !existingNames.has(tag));
    if (missingNames.length > 0) {
      await admin.from("tags").insert(
        missingNames.map((tag) => ({
          name: tag,
          slug: tag.toLowerCase().replace(/\s+/g, "-")
        }))
      );
    }

    const { data: allTagRows } = await admin
      .from("tags")
      .select("id,name")
      .in("name", payload.tags);
    if ((allTagRows?.length ?? 0) > 0) {
      await admin.from("event_tags").insert(
        (allTagRows ?? []).map((tag) => ({
          event_id: payload.eventId,
          tag_id: tag.id
        }))
      );
    }
  }

  if (payload.people.length > 0) {
    await admin.from("event_people").insert(
      payload.people.map((name) => ({
        event_id: payload.eventId,
        person_name: name
      }))
    );
  }

  if (payload.places.length > 0) {
    await admin.from("event_places").insert(
      payload.places.map((name) => ({
        event_id: payload.eventId,
        place_name: name
      }))
    );
  }

  if (payload.sourceIds.length > 0) {
    await admin.from("event_sources").insert(
      payload.sourceIds.map((sourceId) => ({
        event_id: payload.eventId,
        source_id: sourceId
      }))
    );
  }

  if (payload.imageUrls.length > 0) {
    await admin.from("event_images").insert(
      payload.imageUrls.map((url, index) => ({
        event_id: payload.eventId,
        image_url: url,
        sort_order: index + 1
      }))
    );
  }
}

