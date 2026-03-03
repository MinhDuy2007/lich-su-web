import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { SearchForm } from "@/components/events/search-form";
import { SiteShell } from "@/components/layout/site-shell";
import { searchEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await searchEvents({ page: 1, pageSize: 6 });

  return (
    <SiteShell>
      <section className="hero-grid relative overflow-hidden rounded-3xl border border-border bg-card/55 p-6 md:p-10">
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/15" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" />
            Next.js + Supabase + Gemini
          </div>
          <h1 className="text-3xl font-bold leading-tight text-fg md:text-5xl">
            Tra cuu lich su hien dai, co AI tom tat va hoi dap theo su kien
          </h1>
          <p className="text-sm leading-7 text-fg/75 md:text-base">
            He thong LichSuAI ho tro tim kiem su kien, xem chi tiet theo timeline,
            luu yeu thich, theo doi lich su va quan tri du lieu bang vai tro.
          </p>
          <SearchForm />
          <div className="flex flex-wrap gap-3 text-xs">
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-fg/80 transition hover:border-primary/30"
              href="/auth/dang-ky"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              Tao tai khoan
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-fg/80 transition hover:border-primary/30"
              href="/admin"
            >
              Quan tri he thong
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-fg">Su kien noi bat</h2>
          <Link className="text-sm font-semibold text-primary" href="/tim-kiem">
            Xem tat ca
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

