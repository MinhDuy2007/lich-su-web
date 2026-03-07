import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildEventDateColumns } from "@/lib/event-persistence";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";
import { validateFlexibleDate, validateFlexibleDateRange } from "@/lib/flexible-date";
import { isMissingColumnError } from "@/lib/db-compat";
import { pushNotificationToUsers } from "@/lib/notifications";

const optionalPartialNumber = z.preprocess((value) => {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isInteger(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().nullable().optional());

const submissionSchema = z
  .object({
    title: z.string().trim().min(3).max(255),
    summary: z.string().trim().min(10).max(1000),
    content: z.string().trim().min(20),
    startYear: optionalPartialNumber,
    startMonth: optionalPartialNumber,
    startDay: optionalPartialNumber,
    endYear: optionalPartialNumber,
    endMonth: optionalPartialNumber,
    endDay: optionalPartialNumber,
    eventType: z.string().trim().max(120).optional().nullable(),
    locationText: z.string().trim().max(255).optional().nullable(),
    country: z.string().trim().max(120).optional().nullable(),
    tags: z.array(z.string().trim().min(1)).default([]),
    people: z.array(z.string().trim().min(1)).default([]),
    places: z.array(z.string().trim().min(1)).default([]),
    sourceIds: z.array(z.string().uuid()).default([]),
    customSources: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(255),
          url: z.string().trim().url().nullable().optional()
        })
      )
      .default([]),
    imageUrls: z.array(z.string().url()).default([])
  })
  .superRefine((value, ctx) => {
    const startErrors = validateFlexibleDate(
      {
        year: value.startYear,
        month: value.startMonth,
        day: value.startDay
      },
      {
        label: "Má»‘c báº¯t Ä‘áº§u"
      }
    );
    const endErrors = validateFlexibleDate(
      {
        year: value.endYear,
        month: value.endMonth,
        day: value.endDay
      },
      {
        label: "Má»‘c káº¿t thÃºc"
      }
    );
    const rangeErrors = validateFlexibleDateRange(
      {
        year: value.startYear,
        month: value.startMonth,
        day: value.startDay
      },
      {
        year: value.endYear,
        month: value.endMonth,
        day: value.endDay
      }
    );

    [...startErrors, ...endErrors, ...rangeErrors].forEach((message) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message
      });
    });
  });

export async function POST(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) return fail("Cáº§n Ä‘Äƒng nháº­p", 401);

  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `event:submission:${user.id}:${ip}`,
    limit: 10,
    windowMs: 10 * 60_000
  });
  if (!limiter.allowed) {
    return fail("Báº¡n gá»­i Ä‘á» xuáº¥t quÃ¡ nhanh", 429);
  }

  const json = await request.json();
  const parsed = submissionSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
  }

  const admin = createSupabaseAdmin();
  const dateColumns = buildEventDateColumns(parsed.data);
  let insertResult = await admin
    .from("event_submissions")
    .insert({
      submitted_by: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      ...dateColumns,
      event_type: parsed.data.eventType ?? null,
      location_text: parsed.data.locationText ?? null,
      country: parsed.data.country ?? null,
      tags: parsed.data.tags,
      people: parsed.data.people,
      places: parsed.data.places,
      source_ids: parsed.data.sourceIds,
      custom_sources: parsed.data.customSources,
      image_urls: parsed.data.imageUrls,
      status: "pending"
    })
    .select("id")
    .single();

  if (
    isMissingColumnError(insertResult.error, [
      "start_year",
      "start_month",
      "start_day",
      "source_ids",
      "custom_sources"
    ])
  ) {
    insertResult = await admin
      .from("event_submissions")
      .insert({
        submitted_by: user.id,
        title: parsed.data.title,
        summary: parsed.data.summary,
        content: parsed.data.content,
        start_date: dateColumns.start_date,
        end_date: dateColumns.end_date,
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
  }

    const { data, error } = insertResult;

  if (error || !data) {
    return fail("Không tạo được đề xuất", 500, error?.message);
  }

  try {
    const rolesResult = await admin
      .from("user_roles")
      .select("user_id,role,created_at")
      .in("role", ["admin", "moderator"])
      .order("created_at", { ascending: false });

    if (!rolesResult.error) {
      const seen = new Set<string>();
      const staffIds: string[] = [];
      for (const row of rolesResult.data ?? []) {
        if (!row.user_id || seen.has(row.user_id)) {
          continue;
        }
        seen.add(row.user_id);
        staffIds.push(row.user_id);
      }

      if (staffIds.length > 0) {
        await pushNotificationToUsers(admin, staffIds, {
          type: "admin_broadcast",
          title: "Có đề xuất sự kiện mới",
          body: `Người dùng vừa gửi đề xuất \"${parsed.data.title}\".`,
          link: "/admin/kiem-duyet",
          metadata: {
            submissionId: data.id,
            submittedBy: user.id
          }
        });
      }
    }
  } catch {
    // Do not fail submission when staff notification insertion fails.
  }

  return ok({ submissionId: data.id }, 201);
}

