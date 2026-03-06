import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";

export default function NotFoundPage() {
  return (
    <SiteShell>
      <section className="card-glass mx-auto max-w-2xl rounded-3xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg/60">404</p>
        <h1 className="mt-2 text-3xl font-bold">Trang không tồn tại</h1>
        <p className="mt-3 text-sm text-fg/70">
          Liên kết có thể đã thay đổi hoặc nội dung này không còn khả dụng.
        </p>

        <form action="/tim-kiem" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="not-found-search">
            Tìm sự kiện
          </label>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none ring-primary/30 transition focus:ring-2"
            id="not-found-search"
            name="query"
            placeholder="Tìm sự kiện bạn cần"
            type="search"
          />
          <button
            className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-105"
            type="submit"
          >
            Tìm sự kiện
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
            href="/"
          >
            Về trang chủ
          </Link>
          <Link
            className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg/80"
            href="/dong-thoi-gian"
          >
            Xem dòng thời gian
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
