import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { otpVerifySchema } from "@/lib/validation";
import { verifyOtpSession } from "@/lib/auth-flows";

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, otpVerifySchema);
  if (!parsed.data) {
    return fail(parsed.error ?? "Payload khong hop le", 400);
  }

  const check = await verifyOtpSession({
    otpRequestId: parsed.data.otpRequestId,
    otpCode: parsed.data.otpCode
  });
  if (!check.ok) {
    return fail(check.message, 400);
  }

  return ok({ verified: true });
}

