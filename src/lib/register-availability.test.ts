import { describe, expect, it } from "vitest";
import {
  USERNAME_REGEX,
  normalizeEmail,
  normalizeUsername
} from "./register-availability";

describe("register availability utils", () => {
  it("chuẩn hóa username và email", () => {
    expect(normalizeUsername("  TeSt_User  ")).toBe("test_user");
    expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });

  it("regex username đúng theo rule 4-30 ký tự", () => {
    expect(USERNAME_REGEX.test("ab")).toBe(false);
    expect(USERNAME_REGEX.test("user_ok_123")).toBe(true);
    expect(USERNAME_REGEX.test("UserUpper")).toBe(false);
  });
});
