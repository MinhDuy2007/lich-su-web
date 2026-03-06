import { AdminShell } from "@/components/admin/admin-shell";
import { ModerationAdmin } from "@/components/admin/moderation-admin";
import { requireAdminOrModerator } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  await requireAdminOrModerator();

  return (
    <AdminShell pathname="/admin/kiem-duyet">
      <h1 className="text-3xl font-bold">Kiểm duyệt nội dung người dùng đề xuất</h1>
      <ModerationAdmin />
    </AdminShell>
  );
}
