import { AdminShell } from "@/components/admin/admin-shell";
import { SourcesAdmin } from "@/components/admin/sources-admin";
import { requireAdminOrModerator } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  await requireAdminOrModerator();

  return (
    <AdminShell pathname="/admin/nguon">
      <h1 className="text-3xl font-bold">Quan ly nguon</h1>
      <SourcesAdmin />
    </AdminShell>
  );
}

