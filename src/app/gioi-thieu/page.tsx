import { SiteShell } from "@/components/layout/site-shell";
import { SupportRequestForm } from "@/components/support/support-request-form";

const items = [
  "Tra cứu sự kiện theo từ khóa, mốc thời gian và chủ đề liên quan.",
  "Lưu bài viết, ghi chú cá nhân và theo dõi cập nhật mới.",
  "Dùng AI để tóm tắt nhanh hoặc hỏi đáp theo nội dung sự kiện.",
  "Gửi đề xuất nội dung mới và theo dõi phản hồi từ đội ngũ kiểm duyệt."
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="space-y-6">
        <header className="card-glass rounded-3xl p-8">
          <h1 className="text-3xl font-bold">Giới thiệu LịchSửAI</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-fg/75">
            LịchSửAI là nền tảng tra cứu sự kiện lịch sử với trải nghiệm rõ ràng, dễ dùng
            và tập trung vào thao tác bạn cần làm ngay.
          </p>
        </header>

        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <li className="card-glass rounded-2xl p-4 text-sm" key={item}>
              {item}
            </li>
          ))}
        </ul>

        <SupportRequestForm />
      </section>
    </SiteShell>
  );
}
