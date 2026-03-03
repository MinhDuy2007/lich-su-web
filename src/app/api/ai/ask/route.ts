import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { aiAskSchema } from "@/lib/validation";
import { getAuthUserFromRequest } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { callGeminiGenerate } from "@/lib/gemini";
import { ensureAiQuota, getUserGeminiKey, increaseAiUsage } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { readClientIp } from "@/lib/ip-ban";

export async function POST(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `ai:ask:${ip}`,
    limit: 30,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Ban dang goi AI qua nhanh", 429);
  }

  const parsed = await parseBody(request, aiAskSchema);
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
  const { data: event } = await admin
    .from("events")
    .select("id,title,summary,content")
    .eq("id", parsed.data.eventId)
    .eq("status", "published")
    .maybeSingle();
  if (!event) {
    return fail("Su kien khong ton tai", 404);
  }

  const { data: cachedMessage } = await admin
    .from("ai_messages")
    .select("answer")
    .eq("user_id", user.id)
    .eq("event_id", parsed.data.eventId)
    .eq("question", parsed.data.question)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cachedMessage?.answer) {
    return ok({
      answer: cachedMessage.answer,
      fromCache: true
    });
  }

  const apiKey = await getUserGeminiKey(user.id);
  if (!apiKey) {
    return fail("Ban chua luu Gemini API key trong tai khoan", 400);
  }

  const prompt = [
    "Ban la tro ly lich su, hay tra loi cau hoi dua tren su kien cho san.",
    "Neu cau hoi nam ngoai noi dung su kien, hay noi ro pham vi thong tin.",
    `Su kien: ${event.title}`,
    `Tom tat: ${event.summary}`,
    `Noi dung: ${event.content}`,
    `Cau hoi: ${parsed.data.question}`
  ].join("\n");

  const answer = await callGeminiGenerate({
    apiKey,
    prompt
  });

  const { error } = await admin.from("ai_messages").insert({
    user_id: user.id,
    event_id: event.id,
    question: parsed.data.question,
    answer
  });
  if (error) {
    return fail("Khong luu duoc hoi dap AI", 500, error.message);
  }

  await increaseAiUsage(user.id);
  return ok({
    answer,
    fromCache: false
  });
}

