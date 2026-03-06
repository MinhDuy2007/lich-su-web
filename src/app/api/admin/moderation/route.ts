import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBody } from "@/lib/parse-body";
import { moderationActionSchema } from "@/lib/validation";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";
import { pushNotificationToUser } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Không đủ quyền", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_submissions")
    .select("id,title,summary,content,status,created_at,submitted_by")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return fail("Không tải được danh sách kiểm duyệt", 500, error.message);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Không đủ quyền", access.status);
  }

  const parsed = await parseBody(request, moderationActionSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload không hợp lệ", 400);
  }

  const admin = createSupabaseAdmin();
  const { data: submission, error: submissionError } = await admin
    .from("event_submissions")
    .select("*")
    .eq("id", parsed.data.submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    return fail("Không tìm thấy bài gửi", 404);
  }
  if (submission.status !== "pending") {
    return fail("Bài gửi đã được xử lý", 400);
  }

  if (parsed.data.action === "reject") {
    const { error } = await admin
      .from("event_submissions")
      .update({
        status: "rejected",
        reviewed_by: access.userId,
        reviewed_at: new Date().toISOString(),
        review_note: parsed.data.note ?? null
      })
      .eq("id", submission.id);
    if (error) {
      return fail("Từ chối bài gửi thất bại", 500, error.message);
    }

    try {
      await pushNotificationToUser(admin, submission.submitted_by, {
        type: "submission_reviewed",
        title: "Đề xuất đã được xử lý",
        body: "Đề xuất của bạn đã bị từ chối. Hãy mở chi tiết để xem ghi chú của quản trị.",
        link: "/tai-khoan"
      });
    } catch {
      // Do not fail moderation when notification insertion fails.
    }

    return ok({ reviewed: true });
  }

  const insertResult = await admin
    .from("events")
    .insert({
      slug: slugify(submission.title),
      title: submission.title,
      summary: submission.summary,
      content: submission.content,
      start_date: submission.start_date,
      end_date: submission.end_date,
      event_type: submission.event_type,
      location_text: submission.location_text,
      country: submission.country,
      status: "published",
      created_by: access.userId,
      updated_by: access.userId
    })
    .select("id,slug")
    .single();

  if (insertResult.error || !insertResult.data) {
    return fail(
      "Không tạo được sự kiện từ bài gửi",
      500,
      insertResult.error?.message
    );
  }

  await syncEventRelations({
    eventId: insertResult.data.id,
    tags: submission.tags ?? [],
    people: submission.people ?? [],
    places: submission.places ?? [],
    sourceIds: [],
    imageUrls: submission.image_urls ?? []
  });

  const { error: updateSubmissionError } = await admin
    .from("event_submissions")
    .update({
      status: "approved",
      approved_event_id: insertResult.data.id,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note ?? null
    })
    .eq("id", submission.id);

  if (updateSubmissionError) {
    return fail(
      "Đã tạo sự kiện nhưng cập nhật bài gửi thất bại",
      500,
      updateSubmissionError.message
    );
  }

  try {
    await pushNotificationToUser(admin, submission.submitted_by, {
      type: "submission_reviewed",
      title: "Đề xuất đã được duyệt",
      body: "Đề xuất sự kiện của bạn đã được duyệt và đăng công khai.",
      link: insertResult.data.slug ? `/su-kien/${insertResult.data.slug}` : "/tai-khoan"
    });
  } catch {
    // Do not fail moderation when notification insertion fails.
  }

  return ok({
    reviewed: true,
    eventId: insertResult.data.id
  });
}
