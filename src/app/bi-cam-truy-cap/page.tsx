import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BlockedAccessPage() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-red-400/40 bg-card p-8 text-center">
      <h1 className="text-2xl font-bold text-red-500">Truy cập đã bị chặn</h1>
      <p className="mt-3 text-sm text-fg/80">
        Địa chỉ IP hoặc tài khoản của bạn đang bị khóa. Nếu bạn nghĩ đây là nhầm
        lẫn, hãy liên hệ quản trị viên để được hỗ trợ.
      </p>
      <div className="mt-6">
        <Link
          className="inline-flex items-center rounded-xl border border-border bg-bg px-4 py-2 text-sm font-semibold hover:border-primary/40 hover:text-primary"
          href="/"
        >
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
