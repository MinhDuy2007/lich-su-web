import { describe, expect, it } from "vitest";
import { extractImageUrlsFromHtml, sanitizeRichContentHtml } from "./rich-content";

describe("rich content utils", () => {
  it("loại bỏ script độc hại khi sanitize", () => {
    const dirty = `<p>Nội dung</p><script>alert("xss")</script><img src="https://cdn.test/ok.jpg" onerror="alert(1)" />`;
    const clean = sanitizeRichContentHtml(dirty);

    expect(clean).toContain("<p>Nội dung</p>");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("onerror=");
  });

  it("trích xuất danh sách ảnh duy nhất từ HTML", () => {
    const html = `
      <p>Đoạn mở đầu</p>
      <img src="https://cdn.test/a.jpg" />
      <img src="https://cdn.test/a.jpg" />
      <img src="https://cdn.test/b.jpg" />
    `;
    const urls = extractImageUrlsFromHtml(html);

    expect(urls).toEqual(["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"]);
  });
});
