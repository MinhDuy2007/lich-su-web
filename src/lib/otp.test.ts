import { describe, expect, it } from "vitest";
import { generateOtpCode, getOtpExpiresAt } from "./otp";

describe("otp util", () => {
  it("tạo otp 8 số", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{8}$/);
  });

  it("tạo thời gian hết hạn phía trước hiện tại", () => {
    const expiresAt = getOtpExpiresAt(10);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

