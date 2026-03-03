import { describe, expect, it } from "vitest";
import { generateOtpCode, getOtpExpiresAt } from "./otp";

describe("otp util", () => {
  it("tao otp 8 so", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{8}$/);
  });

  it("tao thoi gian het han phia truoc hien tai", () => {
    const expiresAt = getOtpExpiresAt(10);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

