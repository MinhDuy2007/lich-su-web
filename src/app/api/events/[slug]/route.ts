import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getEventBySlug } from "@/lib/events";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_: NextRequest, context: Params) {
  const { slug } = await context.params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return fail("Khong tim thay su kien", 404);
  }

  const admin = createSupabaseAdmin();
  const { data: sourceRows } = await admin
    .from("event_sources")
    .select("sources(id,name,url)")
    .eq("event_id", event.id);

  type SourceRow = {
    sources: {
      id: string;
      name: string;
      url: string | null;
    } | null;
  };
  const sources =
    (sourceRows as SourceRow[] | null | undefined)
      ?.map((row) => row.sources)
      .filter((row): row is NonNullable<SourceRow["sources"]> => Boolean(row)) ?? [];

  return ok({
    ...event,
    sources
  });
}
