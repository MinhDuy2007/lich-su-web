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
  short: "khoảng 120-160 từ",
  medium: "khoảng 220-260 từ",
  long: "khoảng 350-420 từ"
} as const;

const MAX_SUMMARY_INPUT_CHARS = 12000;

function trimForModel(content: string) {
  if (content.length <= MAX_SUMMARY_INPUT_CHARS) {
    return content;
  }
  return `${content.slice(0, MAX_SUMMARY_INPUT_CHARS)}\n\n[Nội dung đã được rút gọn để phù hợp giới hạn token của mô hình AI]`;
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
      return fail("Bạn đang gọi AI quá nhanh", 429);
    }

    const parsed = await parseBody(request, aiSummarizeSchema);
    if (!parsed.data) {
      return fail(parsed.error ?? "Payload không hợp lệ", 400);
    }

    const { user } = await getAuthUserFromRequest(request);
    if (!user) {
      return fail("Cần đăng nhập để dùng tính năng AI", 401);
    }

    const quota = await ensureAiQuota(user.id, 20);
    if (quota.remaining <= 0) {
      return fail("Bạn đã hết lượt AI trong ngày", 429);
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
      return fail("Sự kiện không tồn tại hoặc chưa được xuất bản", 404);
    }

    const styleInstruction =
      parsed.data.style === "bullets"
        ? "Trình bày dạng gạch đầu dòng."
        : "Trình bày dạng đoạn văn mạch lạc.";
    const outputLength = parsed.data.length ?? "short";
    const safeContent = trimForModel(event.content);
    const prompt = [
      "Bạn là trợ lý lịch sử. Hãy tóm tắt sự kiện bên dưới.",
      `Độ dài mong muốn: ${lengthMap[outputLength]}.`,
      styleInstruction,
      "Nội dung:",
      `Tiêu đề: ${event.title}`,
      `Mô tả ngắn: ${event.summary}`,
      `Nội dung đầy đủ: ${safeContent}`
    ].join("\n");

    const summary = await callGeminiGenerate({
      prompt
    });

    if (!summary) {
      return fail("AI không trả về nội dung tóm tắt", 502);
    }

    const { error: insertError } = await admin.from("ai_summaries_cache").insert({
      user_id: user.id,
      event_id: event.id,
      style: parsed.data.style,
      length: parsed.data.length,
      summary
    });
    if (insertError) {
      return fail("Không lưu được bản tóm tắt tạm", 500, insertError.message);
    }

    await increaseAiUsage(user.id);
    return ok({
      summary,
      fromCache: false
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi hệ thống khi gọi AI tóm tắt";
    console.error("[ai/summarize] unexpected error", {
      message
    });
    return fail("Không gọi được AI lúc này", 500, message);
  }
}
