import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type AppNotificationType =
  | "comment_like"
  | "submission_reviewed"
  | "report_response"
  | "event_updated"
  | "admin_broadcast"
  | "support_request";

interface NotificationPayload {
  type: AppNotificationType;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
}

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

function uniqueUsers(userIds: string[]) {
  return Array.from(new Set(userIds.filter((value) => value.trim().length > 0)));
}

function buildInsertRows(userIds: string[], payload: NotificationPayload) {
  const targetUsers = uniqueUsers(userIds);
  if (targetUsers.length === 0) {
    return [];
  }

  return targetUsers.map((userId) => ({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
    metadata: payload.metadata ?? {}
  }));
}

export async function pushNotificationToUsers(
  admin: AdminClient,
  userIds: string[],
  payload: NotificationPayload
) {
  const rows = buildInsertRows(userIds, payload);
  if (rows.length === 0) {
    return { inserted: 0 };
  }

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  return { inserted: rows.length };
}

export async function pushNotificationToUser(
  admin: AdminClient,
  userId: string,
  payload: NotificationPayload
) {
  return pushNotificationToUsers(admin, [userId], payload);
}

export async function markAllNotificationsRead(admin: AdminClient, userId: string) {
  const { error } = await admin
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markNotificationsReadByIds(
  admin: AdminClient,
  userId: string,
  notificationIds: string[]
) {
  if (notificationIds.length === 0) {
    return;
  }

  const { error } = await admin
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .in("id", notificationIds);

  if (error) {
    throw new Error(error.message);
  }
}
