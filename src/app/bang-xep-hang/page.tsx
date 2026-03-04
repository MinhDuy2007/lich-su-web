import Image from "next/image";
import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SubmissionRow {
  submitted_by: string;
}

export default async function LeaderboardPage() {
  const admin = createSupabaseAdmin();
  const [profilesResult, approvedResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id,username,display_name,avatar_url")
      .limit(5000),
    admin
      .from("event_submissions")
      .select("submitted_by")
      .eq("status", "approved")
      .limit(20000)
  ]);

  if (profilesResult.error || approvedResult.error) {
    return (
      <SiteShell>
        <section className="card-glass rounded-2xl p-6 text-sm text-red-500">
          Khong tai duoc bang xep hang luc nay.
        </section>
      </SiteShell>
    );
  }

  const countMap = new Map<string, number>();
  ((approvedResult.data ?? []) as SubmissionRow[]).forEach((row) => {
    countMap.set(row.submitted_by, (countMap.get(row.submitted_by) ?? 0) + 1);
  });

  const items = ((profilesResult.data ?? []) as ProfileRow[])
    .map((profile) => ({
      userId: profile.user_id,
      username: profile.username,
      displayName: profile.display_name ?? "User",
      avatarUrl: profile.avatar_url,
      contributionCount: countMap.get(profile.user_id) ?? 0
    }))
    .filter((item) => item.contributionCount > 0)
    .sort((a, b) => {
      if (b.contributionCount !== a.contributionCount) {
        return b.contributionCount - a.contributionCount;
      }
      return a.username.localeCompare(b.username);
    });

  return (
    <SiteShell>
      <section className="space-y-5">
        <header>
          <h1 className="text-3xl font-bold">Bang xep hang dong gop</h1>
          <p className="mt-2 text-sm text-fg/70">
            Xep hang theo so de xuat su kien da duoc duyet.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="card-glass rounded-2xl p-6 text-sm text-fg/65">
            Chua co dong gop nao duoc duyet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border bg-card/70 text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-fg/70">
                <tr>
                  <th className="px-4 py-3">Hang</th>
                  <th className="px-4 py-3">Thanh vien</th>
                  <th className="px-4 py-3 text-right">Dong gop duoc duyet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, index) => (
                  <tr key={item.userId}>
                    <td className="px-4 py-3 font-semibold text-primary">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        className="flex items-center gap-3 hover:text-primary"
                        href={`/user/${item.username}`}
                      >
                        <div className="relative h-9 w-9 overflow-hidden rounded-full border border-border bg-bg">
                          {item.avatarUrl ? (
                            <Image
                              alt={item.displayName}
                              className="object-cover"
                              fill
                              sizes="36px"
                              src={item.avatarUrl}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-fg/55">
                              {item.displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{item.displayName}</p>
                          <p className="text-xs text-fg/60">@{item.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.contributionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
