import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { verifyCaptchaSession } from "@/lib/auth-flows";
import { z } from "zod";

const schema = z.object({
  captchaSessionId: z.string().uuid(),
  captchaAnswer: z.string().min(4).max(12)
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, schema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const check = await verifyCaptchaSession({
    sessionId: parsed.data.captchaSessionId,
    answer: parsed.data.captchaAnswer
  });

  if (!check.ok) {
    return fail(check.message, 400);
  }

  return ok({ verified: true });
}

