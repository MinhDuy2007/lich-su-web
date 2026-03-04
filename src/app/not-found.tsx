import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";

export default function NotFoundPage() {
  return (
    <SiteShell>
      <section className="card-glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <h1 className="text-3xl font-bold">Trang Không Tồn Tại</h1>
        <p className="mt-3 text-sm text-fg/70">
          Trang này không tồn tại hoặc đã bị xóa
        </p>
        <Link
          className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
          href="/"
        >
          Về trang chủ
        </Link>
      </section>
    </SiteShell>
  );
}

