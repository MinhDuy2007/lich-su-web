import { AdminShell } from "@/components/admin/admin-shell";
import { ModerationAdmin } from "@/components/admin/moderation-admin";
import { requireAdminOrModerator } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  await requireAdminOrModerator();

  return (
    <AdminShell pathname="/admin/kiem-duyet">
      <h1 className="text-3xl font-bold">Kiem duyet de xuat</h1>
      <ModerationAdmin />
    </AdminShell>
  );
}

