import { SiteShell } from "@/components/layout/site-shell";

const items = [
  "Tìm sự kiện theo từ khóa, mốc thời gian và chủ đề.",
  "Lưu sự kiện, ghi chú cá nhân, xem lại khi cần.",
  "Hỏi AI để tóm tắt nhanh hoặc làm rõ nội dung.",
  "Đóng góp dữ liệu và theo dõi trạng thái duyệt."
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="space-y-6">
        <header className="card-glass rounded-3xl p-8">
          <h1 className="text-3xl font-bold">Giới thiệu LịchSửAI</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-fg/75">
            LịchSửAI là nền tảng tra cứu sự kiện lịch sử bằng trải nghiệm rõ ràng,
            dễ dùng và tập trung vào thao tác bạn cần làm ngay.
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
