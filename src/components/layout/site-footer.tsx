import Link from "next/link";

const footerCols = [
  {
    title: "Khám phá",
    items: [
      { href: "/tim-kiem", label: "Tìm sự kiện" },
      { href: "/dong-thoi-gian", label: "Dòng thời gian" },
      { href: "/thu-vien", label: "Thư viện cá nhân" }
    ]
  },
  {
    title: "Liên hệ",
    items: [
      { href: "mailto:support@lichsuai.vn", label: "minhduy.contactwithme@gmail.com" },
      { href: "tel:+84901234567", label: "079 6950 737" },
      { href: "/gioi-thieu", label: "Gửi góp ý cho đội ngũ" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">Web Tra Cứu Lịch Sử</h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-fg/70">
            Tra cứu sự kiện lịch sử theo cách trực quan, lưu lại nội dung quan trọng và
            xem lại nhanh khi cần.
          </p>
        </div>

        {footerCols.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-fg">
              {col.title}
            </h4>
            <ul className="mt-3 space-y-2">
              {col.items.map((item) => {
                const isExternal = item.href.startsWith("mailto:") || item.href.startsWith("tel:");
                return (
                  <li key={item.href}>
                    <Link
                      className="text-sm text-fg/70 transition hover:text-primary"
                      href={item.href}
                      rel={isExternal ? "noreferrer" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/70 px-4 py-4 text-center text-xs text-fg/60">
        {new Date().getFullYear()} Web Tra cứu sự kiện lịch sử được thực hiện nhằm phục vụ cho bài NCKH DHTV
      </div>
    </footer>
  );
}
