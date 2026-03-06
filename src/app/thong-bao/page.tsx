import { Suspense } from "react";
import { NotificationsPageClient } from "@/components/user/notifications-page-client";
import { SiteShell } from "@/components/layout/site-shell";
import { requireLoggedUser } from "@/lib/access";

export const dynamic = "force-dynamic";

function NotificationsPageFallback() {
  return (
    <div className="card-glass rounded-2xl p-5">
      <p className="text-sm text-fg/70">Đang tải thông báo...</p>
    </div>
  );
}

export default async function NotificationsPage() {
  await requireLoggedUser();

  return (
    <SiteShell>
      <Suspense fallback={<NotificationsPageFallback />}>
        <NotificationsPageClient />
      </Suspense>
    </SiteShell>
  );
}
