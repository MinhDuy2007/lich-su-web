import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { aiAskSchema } from "@/lib/validation";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { callGeminiGenerate } from "@/lib/gemini";
import { ensureAiQuota, increaseAiUsage } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";

const MAX_ASK_INPUT_CHARS = 10000;

function trimForModel(content: string) {
  if (content.length <= MAX_ASK_INPUT_CHARS) {
    return content;
  }
  return `${content.slice(0, MAX_ASK_INPUT_CHARS)}\n\n[Nội dung đã được rút gọn để phù hợp giới hạn token của mô hình AI]`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = readClientIp(request) ?? "unknown";
    const limiter = checkRateLimit({
      key: `ai:ask:${ip}`,
      limit: 30,
      windowMs: 60_000
    });
    if (!limiter.allowed) {
      return fail("Bạn đang gọi AI quá nhanh", 429);
    }

    const parsed = await parseBody(request, aiAskSchema);
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
    const { data: event } = await admin
      .from("events")
      .select("id,title,summary,content")
      .eq("id", parsed.data.eventId)
      .eq("status", "published")
      .maybeSingle();
    if (!event) {
      return fail("Sự kiện không tồn tại", 404);
    }

    const { data: cachedMessage } = await admin
      .from("ai_messages")
      .select("answer")
      .eq("user_id", user.id)
      .eq("event_id", parsed.data.eventId)
      .eq("question", parsed.data.question)
      .neq("answer", "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedMessage?.answer) {
      return ok({
        answer: cachedMessage.answer,
        fromCache: true
      });
    }

    const safeContent = trimForModel(event.content);
    const prompt = [
      "Bạn là trợ lý lịch sử, hãy trả lời câu hỏi dựa trên sự kiện cho sẵn.",
      "Nếu câu hỏi nằm ngoài nội dung sự kiện, hãy nói rõ phạm vi thông tin.",
      `Sự kiện: ${event.title}`,
      `Tóm tắt: ${event.summary}`,
      `Nội dung: ${safeContent}`,
      `Câu hỏi: ${parsed.data.question}`
    ].join("\n");

    const answer = await callGeminiGenerate({
      prompt
    });
    if (!answer) {
      return fail("AI không trả về câu trả lời", 502);
    }

    const insertResult = await admin.from("ai_messages").insert([
      {
        user_id: user.id,
        event_id: event.id,
        question: parsed.data.question,
        answer: "",
        role: "user",
        content: parsed.data.question
      },
      {
        user_id: user.id,
        event_id: event.id,
        question: parsed.data.question,
        answer,
        role: "assistant",
        content: answer
      }
    ]);

    if (insertResult.error) {
      if (insertResult.error.code === "42703") {
        const legacyResult = await admin.from("ai_messages").insert({
          user_id: user.id,
          event_id: event.id,
          question: parsed.data.question,
          answer
        });
        if (legacyResult.error) {
          return fail("Không lưu được hỏi đáp AI", 500, legacyResult.error.message);
        }
      } else {
        return fail("Không lưu được hỏi đáp AI", 500, insertResult.error.message);
      }
    }

    await increaseAiUsage(user.id);
    return ok({
      answer,
      fromCache: false
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi hệ thống khi gọi AI hỏi đáp";
    console.error("[ai/ask] unexpected error", {
      message
    });
    return fail("Không gọi được AI lúc này", 500, message);
  }
}
