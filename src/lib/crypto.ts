import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

export function hashOtpCode(code: string) {
  const env = getEnv();
  return crypto
    .createHmac("sha256", env.OTP_PEPPER)
    .update(code)
    .digest("hex");
}

function getAesKey() {
  const env = getEnv();
  return crypto.createHash("sha256").update(env.APP_ENCRYPTION_KEY).digest();
}

export function encryptText(value: string) {
  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptText(encoded: string) {
  const key = getAesKey();
  const payload = Buffer.from(encoded, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

