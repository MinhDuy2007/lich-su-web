import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getRelatedEvents } from "@/lib/events";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Params) {
  const { id } = await context.params;
  if (!id) {
    return fail("Thieu id su kien", 400);
  }

  const items = await getRelatedEvents(id);
  return ok({ items });
}

