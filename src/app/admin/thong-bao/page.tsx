import { AdminShell } from "@/components/admin/admin-shell";
import { NotificationsAdmin } from "@/components/admin/notifications-admin";
import { requireAdminOrModerator } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const access = await requireAdminOrModerator();
  const role = access.role === "admin" ? "admin" : "moderator";

  return (
    <AdminShell pathname="/admin/thong-bao">
      <h1 className="text-3xl font-bold">Thông báo và báo cáo</h1>
      <NotificationsAdmin role={role} />
    </AdminShell>
  );
}
