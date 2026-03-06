import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { AiHistoryList } from "@/components/user/ai-history-list";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface AiMessageRow {
  id: string;
  role?: "user" | "assistant" | null;
  content?: string | null;
  created_at: string;
  event_id?: string | null;
  question?: string | null;
  answer?: string | null;
}

function normalizeRow(row: AiMessageRow) {
  const content =
    row.content && row.content.trim().length > 0
      ? row.content
      : row.answer && row.answer.trim().length > 0
        ? row.answer
        : row.question && row.question.trim().length > 0
          ? row.question
          : "";

  const role: "user" | "assistant" =
    row.role ?? (row.answer && row.answer.trim().length > 0 ? "assistant" : "user");

  return {
    id: row.id,
    role,
    content,
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
      .map((row) => normalizeRow(row as AiMessageRow))
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
    .map((row) => normalizeRow(row as AiMessageRow))
    .filter((row) => row.content.trim().length > 0);
}

export default async function AccountAiHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/dang-nhap");
  }

  const admin = createSupabaseAdmin();
  const items = await loadHistory(admin, user.id);

  return (
    <SiteShell>
      <section className="space-y-5">
        <header>
          <h1 className="text-3xl font-bold">Lịch sử chat</h1>
          <p className="mt-2 text-sm text-fg/70">
            Xem lại cuộc trò truyện của bạn và AI
          </p>
        </header>
        <AiHistoryList items={items} />
      </section>
    </SiteShell>
  );
}
