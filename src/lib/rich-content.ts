import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "img",
  "figure",
  "figcaption",
  "div",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td"
] as const;

const ALLOWED_CLASSES = {
  div: ["media-side", "media-gallery"],
  img: ["media-side-image", "media-gallery-image"],
  p: ["media-side-text"]
};

export function sanitizeRichContentHtml(input: string) {
  const sanitized = sanitizeHtml(input, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "class", "loading"],
      div: ["class"],
      p: ["class"],
      table: ["class"]
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    allowedClasses: ALLOWED_CLASSES,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer"
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          loading: "lazy"
        }
      })
    }
  });

  return sanitized.trim();
}

export function extractImageUrlsFromHtml(input: string) {
  const urls = new Set<string>();
  const imgSrcRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  for (const match of input.matchAll(imgSrcRegex)) {
    const raw = (match[1] ?? "").trim();
    if (!raw) {
      continue;
    }
    if (!/^https?:\/\//i.test(raw)) {
      continue;
    }
    urls.add(raw);
  }

  return Array.from(urls);
}

export function contentLooksLikeHtml(input: string) {
  return /<[^>]+>/.test(input);
}
