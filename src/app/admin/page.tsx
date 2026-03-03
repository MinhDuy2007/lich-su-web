import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminOrModerator } from "@/lib/access";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminOrModerator();
  const admin = createSupabaseAdmin();

  const [eventsCount, submissionsCount, usersCount, bansCount] = await Promise.all([
    admin.from("events").select("id", { count: "exact", head: true }),
    admin
      .from("event_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin.from("profiles").select("user_id", { count: "exact", head: true }),
    admin
      .from("ip_bans")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
  ]);

  const cards = [
    { label: "Tong su kien", value: eventsCount.count ?? 0 },
    { label: "Cho kiem duyet", value: submissionsCount.count ?? 0 },
    { label: "Nguoi dung", value: usersCount.count ?? 0 },
    { label: "IP dang chan", value: bansCount.count ?? 0 }
  ];

  return (
    <AdminShell pathname="/admin">
      <h1 className="text-3xl font-bold">Bang dieu khien quan tri</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article className="card-glass rounded-2xl p-5" key={card.label}>
            <p className="text-sm text-fg/70">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{card.value}</p>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

