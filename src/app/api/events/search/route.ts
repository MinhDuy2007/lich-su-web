import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { eventSearchSchema } from "@/lib/validation";
import { searchEvents } from "@/lib/events";

function getQueryParams(url: URL) {
  return {
    query: url.searchParams.get("query") ?? undefined,
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
    eventType: url.searchParams.get("eventType") ?? undefined,
    person: url.searchParams.get("person") ?? undefined,
    place: url.searchParams.get("place") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined
  };
}

export async function GET(request: NextRequest) {
  const parsed = eventSearchSchema.safeParse(getQueryParams(request.nextUrl));
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const result = await searchEvents(parsed.data);
  return ok(result);
}

