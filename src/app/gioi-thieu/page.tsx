import { SiteShell } from "@/components/layout/site-shell";

const items = [
  "Tim kiem su kien bang bo loc da tieu chi",
  "Dang ky, dang nhap, OTP qua Supabase Auth Email va captcha SVG",
  "Quan tri su kien, tag, nguon, kiem duyet va import/export",
  "AI tom tat va hoi dap voi Gemini, co cache DB",
  "Dong bo favorites, history, notes cho moi tai khoan"
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="space-y-6">
        <header className="card-glass rounded-3xl p-8">
          <h1 className="text-3xl font-bold">Ve du an LichSuAI</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-fg/75">
            Day la he thong full-stack theo stack Next.js + Supabase + Gemini.
            Du an huong den khai thac du lieu su kien lich su theo cach hien dai,
            bo sung AI tom tat de nguoi dung tiep can nhanh hon.
          </p>
        </header>

        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <li className="card-glass rounded-2xl p-4 text-sm" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
