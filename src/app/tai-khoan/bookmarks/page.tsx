import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { BookmarkList } from "@/components/user/bookmark-list";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface EventRelation {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

interface BookmarkRow {
  id: string;
  event_id: string;
  created_at: string;
  events: EventRelation | EventRelation[] | null;
}

function normalizeEvent(value: BookmarkRow["events"]) {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

async function loadBookmarks(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const result = await admin
    .from("event_bookmarks")
    .select("id,event_id,created_at,events(id,slug,title,summary)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!result.error) {
    return (result.data ?? []) as unknown as BookmarkRow[];
  }

  if (result.error.code !== "42P01") {
    throw result.error;
  }

  const legacyResult = await admin
    .from("favorites")
    .select("id,event_id,created_at,events(id,slug,title,summary)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (legacyResult.error) {
    throw legacyResult.error;
  }
  return (legacyResult.data ?? []) as unknown as BookmarkRow[];
}

export default async function AccountBookmarksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/dang-nhap");
  }

  const admin = createSupabaseAdmin();
  const rows = await loadBookmarks(admin, user.id);
  const items = rows
    .map((row) => {
      const event = normalizeEvent(row.events);
      if (!event) return null;
      return {
        id: row.id,
        eventId: row.event_id,
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        createdAt: row.created_at
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <SiteShell>
      <section className="space-y-5">
        <header>
          <h1 className="text-3xl font-bold">Bookmark su kien</h1>
          <p className="mt-2 text-sm text-fg/70">
            Danh sach su kien lich su ban da luu de doc lai sau.
          </p>
        </header>
        <BookmarkList items={items} />
      </section>
    </SiteShell>
  );
}
