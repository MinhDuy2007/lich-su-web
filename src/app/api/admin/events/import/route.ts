import { NextRequest } from "next/server";
import Papa from "papaparse";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";

interface CsvEventRow {
  title: string;
  summary: string;
  content: string;
  start_date?: string;
  event_type?: string;
  location_text?: string;
  country?: string;
  status?: "draft" | "pending" | "published" | "rejected";
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok || !access.userId) {
    return fail("Không đủ quyền", access.status);
  }

  const { csvText } = (await request.json()) as { csvText?: string };
  if (!csvText || csvText.trim().length === 0) {
    return fail("csvText là bắt buộc", 400);
  }

  const parsed = Papa.parse<CsvEventRow>(csvText, {
    header: true,
    skipEmptyLines: true
  });
  if (parsed.errors.length > 0) {
    return fail("CSV không hợp lệ", 400, parsed.errors);
  }

  const rows = parsed.data
    .filter((row: CsvEventRow) => row.title && row.summary && row.content)
    .map((row: CsvEventRow) => ({
      slug: slugify(row.title),
      title: row.title,
      summary: row.summary,
      content: row.content,
      start_date: row.start_date || null,
      end_date: null,
      event_type: row.event_type || null,
      location_text: row.location_text || null,
      country: row.country || null,
      status: row.status || "draft",
      created_by: access.userId,
      updated_by: access.userId
    }));

  if (rows.length === 0) {
    return fail("Không có dòng hợp lệ để import", 400);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("events").insert(rows).select("id");
  if (error) {
    return fail("Import thất bại", 500, error.message);
  }

  return ok({
    imported: data?.length ?? 0
  });
}
