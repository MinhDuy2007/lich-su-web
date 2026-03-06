import { AdminShell } from "@/components/admin/admin-shell";
import { UsersAdmin } from "@/components/admin/users-admin";
import { requireAdminOnly } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdminOnly();

  return (
    <AdminShell pathname="/admin/nguoi-dung">
      <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
      <UsersAdmin />
    </AdminShell>
  );
}
