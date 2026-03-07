import { createSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

interface CustomSourceInput {
  name: string;
  url?: string | null;
}

function normalizeSourceName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 255);
}

function normalizeSourceUrl(value: string | null | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue.length > 0 ? nextValue : null;
}

export async function resolveSourceIds(
  admin: AdminClient,
  sourceIds: string[],
  customSources: CustomSourceInput[]
) {
  const mergedIds = new Set(sourceIds);

  for (const source of customSources) {
    const normalizedName = normalizeSourceName(source.name);
    if (!normalizedName) {
      continue;
    }

    const normalizedUrl = normalizeSourceUrl(source.url);
    const existingResult = await admin
      .from("sources")
      .select("id,url")
      .eq("name", normalizedName)
      .order("created_at", { ascending: false })
      .limit(20);

    if (existingResult.error) {
      throw new Error(existingResult.error.message);
    }

    const existingRows = existingResult.data ?? [];
    const matchedRow = existingRows.find((row) => (row.url ?? null) === normalizedUrl);
    const fallbackRow = existingRows[0];
    const targetRow = matchedRow ?? fallbackRow;

    if (targetRow?.id) {
      mergedIds.add(targetRow.id);
      continue;
    }

    const insertResult = await admin
      .from("sources")
      .insert({
        name: normalizedName,
        url: normalizedUrl
      })
      .select("id")
      .single();

    if (insertResult.error || !insertResult.data?.id) {
      throw new Error(insertResult.error?.message ?? "Không thêm được nguồn mới");
    }

    mergedIds.add(insertResult.data.id);
  }

  return Array.from(mergedIds);
}
