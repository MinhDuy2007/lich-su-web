import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBody } from "@/lib/parse-body";
import { moderationActionSchema } from "@/lib/validation";
import { syncEventRelations } from "@/lib/admin-events";
import { slugify } from "@/lib/slug";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Khong du quyen", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_submissions")
    .select("id,title,summary,content,status,created_at,submitted_by")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return fail("Khong tai duoc danh sach kiem duyet", 500, error.message);
  }

  return ok({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Khong du quyen", access.status);
  }

  const parsed = await parseBody(request, moderationActionSchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const admin = createSupabaseAdmin();
  const { data: submission, error: submissionError } = await admin
    .from("event_submissions")
    .select("*")
    .eq("id", parsed.data.submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    return fail("Khong tim thay submission", 404);
  }
  if (submission.status !== "pending") {
    return fail("Submission da duoc xu ly", 400);
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
      return fail("Tu choi submission that bai", 500, error.message);
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
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data) {
    return fail("Khong tao duoc event tu submission", 500, insertResult.error?.message);
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
      "Da tao event nhung cap nhat submission that bai",
      500,
      updateSubmissionError.message
    );
  }

  return ok({
    reviewed: true,
    eventId: insertResult.data.id
  });
}

