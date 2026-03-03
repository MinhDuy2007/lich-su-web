const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCaptchaText(length = 6) {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return value;
}

export function buildCaptchaSvg(text: string) {
  const width = 220;
  const height = 80;
  const chars = text
    .split("")
    .map((char, index) => {
      const x = 24 + index * 30;
      const y = 48 + (index % 2 === 0 ? -4 : 5);
      const rotate = (index % 2 === 0 ? -16 : 12) + (Math.random() * 8 - 4);
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" font-size="34" font-family="monospace" fill="#1f2937">${char}</text>`;
    })
    .join("");

  const noise = Array.from({ length: 16 })
    .map(() => {
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const x2 = Math.random() * width;
      const y2 = Math.random() * height;
      const opacity = (Math.random() * 0.4 + 0.15).toFixed(2);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9ca3af" stroke-width="1" opacity="${opacity}" />`;
    })
    .join("");

  const dots = Array.from({ length: 80 })
    .map(() => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 1.8;
      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#6b7280" opacity="0.35" />`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" rx="12" fill="#f3f4f6" />
    ${noise}
    ${dots}
    ${chars}
  </svg>`;
}

