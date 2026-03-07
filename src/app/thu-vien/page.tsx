import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { SubmissionForm } from "@/components/user/submission-form";

export const dynamic = "force-dynamic";

interface FavoriteRow {
  id: string;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
  }> | null;
}

interface HistoryRow {
  id: string;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
  }> | null;
}

interface NoteRow {
  id: string;
  content: string;
  events: Array<{
    id: string;
    slug: string;
    title: string;
  }> | null;
}

export default async function LibraryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/dang-nhap");
  }

  const admin = createSupabaseAdmin();

  const [favoritesResult, historyResult, notesResult, tagsResult, sourcesResult] =
    await Promise.all([
      admin
        .from("favorites")
        .select("id, created_at, events(id,slug,title,summary)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("view_history")
        .select("id, viewed_at, events(id,slug,title,summary)")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(20),
      admin
        .from("event_notes")
        .select("id, content, updated_at, events(id,slug,title)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20),
      admin.from("tags").select("id,name,slug").order("name", { ascending: true }),
      admin.from("sources").select("id,name,url").order("name", { ascending: true })
    ]);

  const favoriteItems = (favoritesResult.data ?? []) as unknown as FavoriteRow[];
  const historyItems = (historyResult.data ?? []) as unknown as HistoryRow[];
  const noteItems = (notesResult.data ?? []) as unknown as NoteRow[];
  const tagItems = tagsResult.data ?? [];
  const sourceItems = sourcesResult.data ?? [];

  return (
    <SiteShell>
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Thư viện cá nhân</h1>
          <p className="mt-2 text-sm text-fg/70">
            Xem lại mục đã lưu, lịch sử tra cứu và gửi đề xuất mới từ một nơi.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card-glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Yêu thích</h2>
            <ul className="space-y-2 text-sm">
              {favoriteItems.map((item) => (
                <li key={item.id}>
                  <a
                    className="text-primary hover:underline"
                    href={`/su-kien/${item.events?.[0]?.slug ?? ""}`}
                  >
                    {item.events?.[0]?.title ?? "Sự kiện"}
                  </a>
                </li>
              ))}
              {favoriteItems.length === 0 ? (
                <li className="text-fg/60">Chưa có sự kiện đã lưu.</li>
              ) : null}
            </ul>
          </div>

          <div className="card-glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Lịch sử tra cứu</h2>
            <ul className="space-y-2 text-sm">
              {historyItems.map((item) => (
                <li key={item.id}>
                  <a
                    className="text-primary hover:underline"
                    href={`/su-kien/${item.events?.[0]?.slug ?? ""}`}
                  >
                    {item.events?.[0]?.title ?? "Sự kiện"}
                  </a>
                </li>
              ))}
              {historyItems.length === 0 ? (
                <li className="text-fg/60">Chưa có lịch sử tra cứu.</li>
              ) : null}
            </ul>
          </div>

          <div className="card-glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Ghi chú</h2>
            <ul className="space-y-3 text-sm">
              {noteItems.map((item) => (
                <li className="rounded-xl border border-border bg-card p-3" key={item.id}>
                  <p className="font-semibold">{item.events?.[0]?.title ?? "Sự kiện"}</p>
                  <p className="mt-1 line-clamp-3 text-fg/70">{item.content}</p>
                </li>
              ))}
              {noteItems.length === 0 ? (
                <li className="text-fg/60">Chưa có ghi chú nào.</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SubmissionForm sources={sourceItems} tags={tagItems} />
        </div>
      </section>
    </SiteShell>
  );
}
