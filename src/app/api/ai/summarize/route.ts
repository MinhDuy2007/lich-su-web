import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { aiSummarizeSchema } from "@/lib/validation";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { callGeminiGenerate } from "@/lib/gemini";
import { ensureAiQuota, increaseAiUsage } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";

const lengthMap = {
  short: "khoang 120-160 tu",
  medium: "khoang 220-260 tu",
  long: "khoang 350-420 tu"
} as const;

const MAX_SUMMARY_INPUT_CHARS = 12000;

function trimForModel(content: string) {
  if (content.length <= MAX_SUMMARY_INPUT_CHARS) {
    return content;
  }
  return `${content.slice(0, MAX_SUMMARY_INPUT_CHARS)}\n\n[Noi dung da duoc rut gon de phu hop gioi han token cua mo hinh AI]`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = readClientIp(request) ?? "unknown";
    const limiter = checkRateLimit({
      key: `ai:summarize:${ip}`,
      limit: 30,
      windowMs: 60_000
    });
    if (!limiter.allowed) {
      return fail("Ban dang goi AI qua nhanh", 429);
    }

    const parsed = await parseBody(request, aiSummarizeSchema);
    if (!parsed.data) {
      return fail(parsed.error ?? "Payload khong hop le", 400);
    }

    const { user } = await getAuthUserFromRequest(request);
    if (!user) {
      return fail("Can dang nhap de dung tinh nang AI", 401);
    }

    const quota = await ensureAiQuota(user.id, 20);
    if (quota.remaining <= 0) {
      return fail("Ban da het luot AI trong ngay", 429);
    }

    const admin = createSupabaseAdmin();
    const { data: cached } = await admin
      .from("ai_summaries_cache")
      .select("id,summary")
      .eq("user_id", user.id)
      .eq("event_id", parsed.data.eventId)
      .eq("style", parsed.data.style)
      .eq("length", parsed.data.length)
      .maybeSingle();

    if (cached) {
      return ok({
        summary: cached.summary,
        fromCache: true
      });
    }

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id,title,summary,content,start_date,event_type,location_text")
      .eq("id", parsed.data.eventId)
      .eq("status", "published")
      .maybeSingle();

    if (eventError || !event) {
      return fail("Su kien khong ton tai hoac chua duoc xuat ban", 404);
    }

    const styleInstruction =
      parsed.data.style === "bullets"
        ? "Trinh bay dang gach dau dong."
        : "Trinh bay dang doan van mach lac.";
    const outputLength = parsed.data.length ?? "short";
    const safeContent = trimForModel(event.content);
    const prompt = [
      "Ban la tro ly lich su. Hay tom tat su kien ben duoi.",
      `Do dai mong muon: ${lengthMap[outputLength]}.`,
      styleInstruction,
      "Noi dung:",
      `Tieu de: ${event.title}`,
      `Mo ta ngan: ${event.summary}`,
      `Noi dung day du: ${safeContent}`
    ].join("\n");

    const summary = await callGeminiGenerate({
      prompt
    });

    if (!summary) {
      return fail("AI khong tra ve noi dung tom tat", 502);
    }

    const { error: insertError } = await admin.from("ai_summaries_cache").insert({
      user_id: user.id,
      event_id: event.id,
      style: parsed.data.style,
      length: parsed.data.length,
      summary
    });
    if (insertError) {
      return fail("Khong luu duoc cache tom tat", 500, insertError.message);
    }

    await increaseAiUsage(user.id);
    return ok({
      summary,
      fromCache: false
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Loi he thong khi goi AI tom tat";
    console.error("[ai/summarize] unexpected error", {
      message
    });
    return fail("Khong goi duoc AI luc nay", 500, message);
  }
}
