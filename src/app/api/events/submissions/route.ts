import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";

const submissionSchema = z.object({
  title: z.string().trim().min(3).max(255),
  summary: z.string().trim().min(10).max(1000),
  content: z.string().trim().min(20),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  locationText: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  places: z.array(z.string()).default([]),
  imageUrls: z.array(z.string().url()).default([])
});

export async function POST(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Cần đăng nhập", 401);

  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `event:submission:${user.id}:${ip}`,
    limit: 10,
    windowMs: 10 * 60_000
  });
  if (!limiter.allowed) {
    return fail("Bạn gửi đề xuất quá nhanh", 429);
  }

  const json = await request.json();
  const parsed = submissionSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("event_submissions")
    .insert({
      submitted_by: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      event_type: parsed.data.eventType ?? null,
      location_text: parsed.data.locationText ?? null,
      country: parsed.data.country ?? null,
      tags: parsed.data.tags,
      people: parsed.data.people,
      places: parsed.data.places,
      image_urls: parsed.data.imageUrls,
      status: "pending"
    })
    .select("id")
    .single();
  if (error || !data) {
    return fail("Không tạo được đề xuất", 500, error?.message);
  }

  return ok({ submissionId: data.id }, 201);
}

