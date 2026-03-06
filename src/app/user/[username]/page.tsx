import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  approved_event_id: string | null;
}

interface EventRow {
  id: string;
  slug: string;
}

async function getBookmarkCount(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const result = await admin
    .from("event_bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!result.error) {
    return result.count ?? 0;
  }

  if (result.error.code !== "42P01") {
    throw result.error;
  }

  const legacyResult = await admin
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (legacyResult.error) {
    throw legacyResult.error;
  }
  return legacyResult.count ?? 0;
}

export default async function PublicUserProfilePage({
  params
}: PublicProfilePageProps) {
  const { username } = await params;
  const admin = createSupabaseAdmin();

  const profileResult = await admin
    .from("profiles")
    .select("user_id,username,display_name,avatar_url,created_at")
    .eq("username", username)
    .maybeSingle();
  if (profileResult.error || !profileResult.data) {
    notFound();
  }

  const profile = profileResult.data as ProfileRow;
  const [bookmarkCount, approvedCountResult, submissionsResult] = await Promise.all([
    getBookmarkCount(admin, profile.user_id),
    admin
      .from("event_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by", profile.user_id)
      .eq("status", "approved"),
    admin
      .from("event_submissions")
      .select("id,title,summary,created_at,approved_event_id")
      .eq("submitted_by", profile.user_id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  const approvedCount = approvedCountResult.count ?? 0;
  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
  const eventIds = submissions
    .map((row) => row.approved_event_id)
    .filter((id): id is string => Boolean(id));

  const eventsMap = new Map<string, string>();
  if (eventIds.length > 0) {
    const eventResult = await admin
      .from("events")
      .select("id,slug")
      .in("id", eventIds);
    (eventResult.data ?? []).forEach((item) => {
      const row = item as EventRow;
      eventsMap.set(row.id, row.slug);
    });
  }

  return (
    <SiteShell>
      <section className="space-y-6">
        <div className="card-glass rounded-2xl p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border bg-card">
              {profile.avatar_url ? (
                <Image
                  alt={profile.display_name ?? "User"}
                  className="object-cover"
                  fill
                  sizes="96px"
                  src={profile.avatar_url}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-fg/60">
                  {(profile.display_name ?? "User").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{profile.display_name ?? "User"}</h1>
              <p className="text-sm text-fg/65">@{profile.username}</p>
              <p className="text-xs text-fg/60">
                Tham gia tu {new Date(profile.created_at).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-fg/65">Bookmark su kien</p>
              <p className="mt-1 text-2xl font-semibold text-primary">{bookmarkCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-fg/65">Dong gop duoc duyet</p>
              <p className="mt-1 text-2xl font-semibold text-primary">{approvedCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-fg/65">Trang thai contributor</p>
              <p className="mt-1 text-sm font-semibold text-fg">
                {approvedCount > 0 ? "Đang đóng góp" : "Mời tham gia"}
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Su kien da dong gop</h2>
          {submissions.length === 0 ? (
            <div className="card-glass rounded-2xl p-5 text-sm text-fg/65">
              Chua co su kien nao duoc duyet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {submissions.map((item) => (
                <article className="card-glass rounded-2xl p-5" key={item.id}>
                  <p className="text-xs text-fg/60">
                    Duyet luc {new Date(item.created_at).toLocaleDateString("vi-VN")}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm text-fg/75">{item.summary}</p>
                  {item.approved_event_id && eventsMap.get(item.approved_event_id) ? (
                    <Link
                      className="mt-3 inline-flex rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary"
                      href={`/su-kien/${eventsMap.get(item.approved_event_id)}`}
                    >
                      Xem su kien da xuat ban
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </SiteShell>
  );
}
