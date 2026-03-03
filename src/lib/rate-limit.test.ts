import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate limit", () => {
  it("chan khi vuot nguong trong cung cua so", () => {
    const key = `rate-test-${Math.random()}`;
    const first = checkRateLimit({
      key,
      limit: 2,
      windowMs: 1000
    });
    const second = checkRateLimit({
      key,
      limit: 2,
      windowMs: 1000
    });
    const third = checkRateLimit({
      key,
      limit: 2,
      windowMs: 1000
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });
});

