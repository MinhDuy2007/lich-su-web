import { AdminShell } from "@/components/admin/admin-shell";
import { EventsAdmin } from "@/components/admin/events-admin";
import { requireAdminOrModerator } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const access = await requireAdminOrModerator();
  const role = access.role === "admin" ? "admin" : "moderator";

  return (
    <AdminShell pathname="/admin/su-kien">
      <h1 className="text-3xl font-bold">Quản lý sự kiện</h1>
      <EventsAdmin role={role} />
    </AdminShell>
  );
}
