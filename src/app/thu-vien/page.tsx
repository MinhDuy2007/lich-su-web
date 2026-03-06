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

  const [favoritesResult, historyResult, notesResult] = await Promise.all([
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
      .limit(20)
  ]);
  const favoriteItems = (favoritesResult.data ?? []) as unknown as FavoriteRow[];
  const historyItems = (historyResult.data ?? []) as unknown as HistoryRow[];
  const noteItems = (notesResult.data ?? []) as unknown as NoteRow[];

  return (
    <SiteShell>
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Thu vien ca nhan</h1>
          <p className="mt-2 text-sm text-fg/70">
            Dong bo yeu thich, lich su va ghi chu tren nhieu thiet bi.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card-glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Yeu thich</h2>
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
                <li className="text-fg/60">Chua co su kien yeu thich.</li>
              ) : null}
            </ul>
          </div>

          <div className="card-glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Lich su tra cuu</h2>
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
                <li className="text-fg/60">Chua co lich su tra cuu.</li>
              ) : null}
            </ul>
          </div>

          <div className="card-glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold">Ghi chu</h2>
            <ul className="space-y-3 text-sm">
              {noteItems.map((item) => (
                <li className="rounded-xl border border-border bg-card p-3" key={item.id}>
                  <p className="font-semibold">{item.events?.[0]?.title ?? "Sự kiện"}</p>
                  <p className="mt-1 line-clamp-3 text-fg/70">{item.content}</p>
                </li>
              ))}
              {noteItems.length === 0 ? (
                <li className="text-fg/60">Chua co ghi chu nao.</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SubmissionForm />
        </div>
      </section>
    </SiteShell>
  );
}
