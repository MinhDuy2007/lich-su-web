import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { fail } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator"]);
  if (!access.ok) {
    return fail("Khong du quyen", access.status);
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events")
    .select("id,slug,title,summary,content,start_date,event_type,location_text,country,status")
    .order("created_at", { ascending: false });

  if (error) {
    return fail("Khong export duoc du lieu", 500, error.message);
  }

  const csv = Papa.unparse(data ?? []);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=events-export.csv"
    }
  });
}

