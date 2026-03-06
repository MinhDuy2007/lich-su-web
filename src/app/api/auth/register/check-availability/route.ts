import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { readClientIp } from "@/lib/ip-ban";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRegisterAvailability } from "@/lib/register-availability";

export async function GET(request: NextRequest) {
  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `auth:register:availability:${ip}`,
    limit: 90,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Bạn kiểm tra thông tin quá nhanh", 429);
  }

  const username = request.nextUrl.searchParams.get("username") ?? "";
  const email = request.nextUrl.searchParams.get("email") ?? "";

  if (!username.trim() && !email.trim()) {
    return fail("Thiếu thông tin cần kiểm tra", 400);
  }

  const availability = await getRegisterAvailability({
    username,
    email
  });

  return ok(availability);
}
