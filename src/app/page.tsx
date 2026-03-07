import Link from "next/link";
import { LogIn, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { SearchForm } from "@/components/events/search-form";
import { SiteShell } from "@/components/layout/site-shell";
import { getSearchTags, searchEvents } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [result, tags, supabase] = await Promise.all([
    searchEvents({ page: 1, pageSize: 6 }),
    getSearchTags(),
    createSupabaseServerClient()
  ]);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <SiteShell>
      <section className="hero-grid relative overflow-hidden rounded-3xl border border-border bg-card/55 p-6 md:p-10">
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/15" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" />
            Tra cứu sự kiện lịch sử Việt Nam
          </div>
          <h1 className="text-3xl font-bold leading-tight text-fg md:text-5xl">
            Tìm sự kiện lịch sử nhanh, rõ và dễ theo dõi
          </h1>
          <p className="text-sm leading-7 text-fg/75 md:text-base">
            Tìm theo từ khóa, xem mốc thời gian, lưu lại nội dung quan tâm và
            nhận tóm tắt nhanh khi cần.
          </p>
          <SearchForm tags={tags} />
          <div className="flex flex-wrap gap-3 text-xs">
            {!user ? (
              <>
                <Link
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-fg/80 transition hover:border-primary/30"
                  href="/auth/dang-ky"
                >
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Đăng ký
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-fg/80 transition hover:border-primary/30"
                  href="/auth/dang-nhap"
                >
                  <LogIn className="h-4 w-4 text-primary" />
                  Đăng nhập
                </Link>
              </>
            ) : (
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-fg/80 transition hover:border-primary/30"
                href="/tai-khoan"
              >
                <UserCircle2 className="h-4 w-4 text-primary" />
                Vào tài khoản
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-fg">Sự kiện nổi bật</h2>
          <Link className="text-sm font-semibold text-primary" href="/tim-kiem">
            Xem tất cả
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
