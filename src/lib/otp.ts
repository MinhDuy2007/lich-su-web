export function generateOtpCode() {
  const code = Math.floor(10_000_000 + Math.random() * 90_000_000);
  return String(code);
}

export function getOtpExpiresAt(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

