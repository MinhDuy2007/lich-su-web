import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { pushNotificationToUsers } from "@/lib/notifications";
import { parseBody } from "@/lib/parse-body";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { supportRequestSchema } from "@/lib/validation";
import { readClientIp } from "@/lib/ip-ban";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `support-request:${ip}`,
    limit: 5,
    windowMs: 10 * 60_000
  });
  if (!limiter.allowed) {
    return fail("Bạn gửi yêu cầu hỗ trợ quá nhanh", 429);
  }

  const parsed = await parseBody(request, supportRequestSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Nội dung hỗ trợ không hợp lệ", 400);
  }

  const { user } = await getAuthUserFromRequest(request);
  const admin = createSupabaseAdmin();
  const insertResult = await admin
    .from("support_requests")
    .insert({
      submitted_by: user?.id ?? null,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone?.trim() || null,
      message: parsed.data.message
    })
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data) {
    return fail("Không gửi được yêu cầu hỗ trợ", 500, insertResult.error?.message);
  }

  try {
    const adminUsersResult = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminIds = Array.from(
      new Set(
        (adminUsersResult.data ?? [])
          .map((row) => row.user_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    if (adminIds.length > 0) {
      await pushNotificationToUsers(admin, adminIds, {
        type: "support_request",
        title: "Có yêu cầu hỗ trợ mới",
        body: `${parsed.data.fullName} vừa gửi nội dung hỗ trợ cần kiểm tra.`,
        link: "/admin/thong-bao",
        metadata: {
          supportRequestId: insertResult.data.id,
          fullName: parsed.data.fullName,
          email: parsed.data.email
        }
      });
    }
  } catch {
    // Do not fail the request when notification insertion fails.
  }

  return ok({ supportRequestId: insertResult.data.id }, 201);
}
