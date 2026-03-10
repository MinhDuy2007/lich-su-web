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
  img: ["media-side-image", "media-gallery-image", "media-image-center", "media-image-full"],
  p: ["media-side-text"]
};

const COLOR_STYLE_PATTERNS = [
  /^#[0-9a-f]{3}([0-9a-f]{3})?$/i,
  /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
  /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0(\.\d+)?|1(\.0+)?)\s*\)$/i
];

export function sanitizeRichContentHtml(input: string) {
  const sanitized = sanitizeHtml(input, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "class", "loading", "style"],
      div: ["class", "style"],
      p: ["class", "style"],
      h2: ["style"],
      h3: ["style"],
      span: ["style"],
      table: ["class"]
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    allowedClasses: ALLOWED_CLASSES,
    allowedStyles: {
      "*": {
        color: COLOR_STYLE_PATTERNS,
        "text-align": [/^left$/, /^center$/, /^right$/, /^justify$/]
      }
    },
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
