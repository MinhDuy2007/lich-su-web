import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

async function isBookmarked(admin: ReturnType<typeof createSupabaseAdmin>, userId: string, eventId: string) {
  const result = await admin
    .from("event_bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!result.error) {
    return Boolean(result.data?.id);
  }

  if (result.error.code === "42P01") {
    const legacyResult = await admin
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (legacyResult.error) {
      throw legacyResult.error;
    }
    return Boolean(legacyResult.data?.id);
  }

  throw result.error;
}

async function upsertBookmark(admin: ReturnType<typeof createSupabaseAdmin>, userId: string, eventId: string) {
  const result = await admin.from("event_bookmarks").upsert(
    {
      user_id: userId,
      event_id: eventId
    },
    {
      onConflict: "user_id,event_id"
    }
  );
  if (!result.error) {
    return;
  }
  if (result.error.code !== "42P01") {
    throw result.error;
  }

  const legacyResult = await admin.from("favorites").upsert(
    {
      user_id: userId,
      event_id: eventId
    },
    {
      onConflict: "user_id,event_id"
    }
  );
  if (legacyResult.error) {
    throw legacyResult.error;
  }
}

async function removeBookmark(admin: ReturnType<typeof createSupabaseAdmin>, userId: string, eventId: string) {
  const result = await admin
    .from("event_bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);
  if (!result.error) {
    return;
  }
  if (result.error.code !== "42P01") {
    throw result.error;
  }

  const legacyResult = await admin
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);
  if (legacyResult.error) {
    throw legacyResult.error;
  }
}

export async function GET(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Can dang nhap", 401);

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  try {
    const value = await isBookmarked(admin, user.id, id);
    return ok({ isBookmarked: value });
  } catch (error) {
    return fail(
      "Khong kiem tra duoc bookmark",
      500,
      error instanceof Error ? error.message : "Loi he thong"
    );
  }
}

export async function POST(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Can dang nhap", 401);

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  try {
    await upsertBookmark(admin, user.id, id);
    return ok({ isBookmarked: true });
  } catch (error) {
    return fail(
      "Khong the them bookmark",
      500,
      error instanceof Error ? error.message : "Loi he thong"
    );
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Can dang nhap", 401);

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  try {
    await removeBookmark(admin, user.id, id);
    return ok({ isBookmarked: false });
  } catch (error) {
    return fail(
      "Khong the bo bookmark",
      500,
      error instanceof Error ? error.message : "Loi he thong"
    );
  }
}
