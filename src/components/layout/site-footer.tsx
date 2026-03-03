import Link from "next/link";

const footerCols = [
  {
    title: "San pham",
    items: [
      { href: "/tim-kiem", label: "Tim kiem su kien" },
      { href: "/dong-thoi-gian", label: "Dong thoi gian" },
      { href: "/thu-vien", label: "Thu vien ca nhan" }
    ]
  },
  {
    title: "He thong",
    items: [
      { href: "/admin", label: "Quan tri" },
      { href: "/auth/dang-ky", label: "Dang ky" },
      { href: "/auth/quen-mat-khau", label: "Quen mat khau" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">LichSuAI Platform</h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-fg/70">
            Nen tang tra cuu su kien lich su, ket hop AI tom tat va hoi dap cho
            nguoi dung va bo may quan tri.
          </p>
        </div>
        {footerCols.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-fg">
              {col.title}
            </h4>
            <ul className="mt-3 space-y-2">
              {col.items.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-sm text-fg/70 transition hover:text-primary"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70 px-4 py-4 text-center text-xs text-fg/60">
        {new Date().getFullYear()} LichSuAI. Tat ca quyen duoc bao luu.
      </div>
    </footer>
  );
}

