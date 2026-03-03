import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("KHONG_TIM_THAY_.env.local");
  process.exit(1);
}

const envRaw = fs.readFileSync(envPath, "utf8");
const envMap = new Map();
for (const line of envRaw.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const index = line.indexOf("=");
  if (index === -1) continue;
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim();
  envMap.set(key, value);
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_ENCRYPTION_KEY",
  "OTP_PEPPER",
  "GEMINI_MODEL"
];

const missing = [];
for (const key of required) {
  const value = envMap.get(key);
  if (!value) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.error("THIEU_ENV:", missing.join(","));
  process.exit(1);
}

console.log("ENV_OK");
for (const key of required) {
  const value = envMap.get(key) ?? "";
  console.log(`${key}=SET(len=${value.length})`);
}
