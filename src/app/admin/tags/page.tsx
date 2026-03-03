import { AdminShell } from "@/components/admin/admin-shell";
import { TagsAdmin } from "@/components/admin/tags-admin";
import { requireAdminOrModerator } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  await requireAdminOrModerator();

  return (
    <AdminShell pathname="/admin/tags">
      <h1 className="text-3xl font-bold">Quan ly tag</h1>
      <TagsAdmin />
    </AdminShell>
  );
}

