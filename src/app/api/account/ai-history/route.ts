import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

interface AiMessageRow {
  id: string;
  role?: "user" | "assistant" | null;
  content?: string | null;
  created_at: string;
  event_id?: string | null;
  question?: string | null;
  answer?: string | null;
}

function normalizeMessage(row: AiMessageRow) {
  const normalizedContent =
    row.content && row.content.trim().length > 0
      ? row.content
      : row.answer && row.answer.trim().length > 0
        ? row.answer
        : row.question && row.question.trim().length > 0
          ? row.question
          : "";

  const normalizedRole: "user" | "assistant" =
    row.role ?? (row.answer && row.answer.trim().length > 0 ? "assistant" : "user");

  return {
    id: row.id,
    role: normalizedRole,
    content: normalizedContent,
    createdAt: row.created_at,
    eventId: row.event_id ?? null
  };
}

async function loadHistory(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const result = await admin
    .from("ai_messages")
    .select("id,role,content,created_at,event_id,question,answer")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(300);

  if (!result.error) {
    return (result.data ?? [])
      .map((row) => normalizeMessage(row as AiMessageRow))
      .filter((row) => row.content.trim().length > 0);
  }

  if (result.error.code !== "42703") {
    throw result.error;
  }

  const legacyResult = await admin
    .from("ai_messages")
    .select("id,created_at,event_id,question,answer")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (legacyResult.error) {
    throw legacyResult.error;
  }

  return (legacyResult.data ?? [])
    .map((row) => normalizeMessage(row as AiMessageRow))
    .filter((row) => row.content.trim().length > 0);
}

export async function GET(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Can dang nhap", 401);
  }

  try {
    const admin = createSupabaseAdmin();
    const items = await loadHistory(admin, user.id);
    return ok({ items });
  } catch (error) {
    return fail(
      "Khong tai duoc lich su AI",
      500,
      error instanceof Error ? error.message : "Loi he thong"
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Can dang nhap", 401);
  }

  const admin = createSupabaseAdmin();
  const result = await admin.from("ai_messages").delete().eq("user_id", user.id);
  if (result.error) {
    return fail("Khong xoa duoc lich su AI", 500, result.error.message);
  }

  return ok({ cleared: true });
}
