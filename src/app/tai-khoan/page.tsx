import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";
import { AccountProfileForm } from "@/components/user/account-profile-form";
import { ChangePasswordForm } from "@/components/user/change-password-form";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getBookmarkCount(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const result = await admin
    .from("event_bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!result.error) {
    return result.count ?? 0;
  }

  if (result.error.code === "42P01") {
    const legacyResult = await admin
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (legacyResult.error) {
      throw legacyResult.error;
    }
    return legacyResult.count ?? 0;
  }

  throw result.error;
}

async function getContributionCount(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const result = await admin
    .from("event_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", userId)
    .eq("status", "approved");

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/dang-nhap");
  }

  const admin = createSupabaseAdmin();
  const profileResult = await admin
    .from("profiles")
    .select("username,email,display_name,avatar_url,created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    redirect("/auth/dang-nhap");
  }

  const [bookmarkCount, contributionCount] = await Promise.all([
    getBookmarkCount(admin, user.id),
    getContributionCount(admin, user.id)
  ]);

  return (
    <SiteShell>
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Tai khoan cua ban</h1>
          <p className="mt-2 text-sm text-fg/70">
            Quan ly thong tin ca nhan, avatar va mat khau.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <AccountProfileForm
            initialData={{
              username: profileResult.data.username,
              email: profileResult.data.email,
              display_name: profileResult.data.display_name ?? "User",
              avatar_url: profileResult.data.avatar_url,
              created_at: profileResult.data.created_at,
              bookmarkCount,
              contributionCount
            }}
          />
          <ChangePasswordForm />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            className="card-glass rounded-2xl p-5 transition hover:border-primary/40"
            href="/tai-khoan/bookmarks"
          >
            <p className="text-sm font-semibold">Bookmark su kien</p>
            <p className="mt-1 text-xs text-fg/65">
              Quan ly danh sach su kien da luu de doc lai.
            </p>
          </Link>
          <Link
            className="card-glass rounded-2xl p-5 transition hover:border-primary/40"
            href="/tai-khoan/ai-history"
          >
            <p className="text-sm font-semibold">Lich su AI chat</p>
            <p className="mt-1 text-xs text-fg/65">
              Xem lai hoi dap va xoa lich su theo nhu cau.
            </p>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
