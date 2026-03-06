import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const USERNAME_TAKEN_MESSAGE = "Tên đăng nhập đã có người dùng.";
export const EMAIL_TAKEN_MESSAGE =
  "Email đã có trên hệ thống. Vui lòng dùng email khác để tránh gửi OTP lãng phí.";
export const USERNAME_REGEX = /^[a-z0-9_]{4,30}$/;

interface AvailabilityOptions {
  username?: string;
  email?: string;
}

interface UsernameAvailability {
  taken: boolean;
  suggestions: string[];
}

interface EmailAvailability {
  taken: boolean;
}

export interface RegisterAvailabilityResult {
  username?: UsernameAvailability;
  email?: EmailAvailability;
}

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeSuggestionBase(value: string) {
  const normalized = normalizeUsername(value).replace(/[^a-z0-9_]/g, "");
  const fallback = normalized.length > 0 ? normalized : "nguoidung";
  return fallback.slice(0, 30);
}

function makeUsernameCandidate(baseValue: string, digits: string) {
  const maxBaseLength = Math.max(1, 30 - digits.length);
  const prefix = baseValue.slice(0, maxBaseLength);
  const candidate = `${prefix}${digits}`.slice(0, 30);

  if (candidate.length >= 4) {
    return candidate;
  }

  return `${candidate}${"0".repeat(4 - candidate.length)}`.slice(0, 30);
}

function randomSuffix() {
  const length = Math.floor(Math.random() * 3) + 3; // 3-5 digits
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function findTakenUsernames(admin: AdminClient, usernames: string[]) {
  if (usernames.length === 0) {
    return new Set<string>();
  }

  const { data } = await admin
    .from("profiles")
    .select("username")
    .in("username", usernames);

  return new Set((data ?? []).map((row) => normalizeUsername(row.username ?? "")));
}

export async function checkUsernameTaken(
  admin: AdminClient,
  username: string
) {
  if (!username) {
    return false;
  }

  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();

  return Boolean(data);
}

export async function checkEmailTaken(admin: AdminClient, email: string) {
  if (!email) {
    return false;
  }

  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();

  return Boolean(data);
}

export async function buildUsernameSuggestions(
  admin: AdminClient,
  rawUsername: string,
  count = 3
) {
  const baseValue = sanitizeSuggestionBase(rawUsername);
  const suggestions = new Set<string>();
  let attempts = 0;

  while (suggestions.size < count && attempts < 8) {
    const candidates = new Set<string>();

    while (candidates.size < 20) {
      const candidate = makeUsernameCandidate(baseValue, randomSuffix());
      if (USERNAME_REGEX.test(candidate)) {
        candidates.add(candidate);
      }
    }

    const candidateList = Array.from(candidates);
    const takenSet = await findTakenUsernames(admin, candidateList);
    for (const candidate of candidateList) {
      if (!takenSet.has(candidate)) {
        suggestions.add(candidate);
      }
      if (suggestions.size >= count) {
        break;
      }
    }

    attempts += 1;
  }

  return Array.from(suggestions).slice(0, count);
}

export async function getRegisterAvailability(
  options: AvailabilityOptions
): Promise<RegisterAvailabilityResult> {
  const admin = createSupabaseAdmin();
  const normalizedUsername = options.username
    ? normalizeUsername(options.username)
    : "";
  const normalizedEmail = options.email
    ? normalizeEmail(options.email)
    : "";

  const result: RegisterAvailabilityResult = {};

  if (normalizedUsername) {
    const usernameTaken =
      USERNAME_REGEX.test(normalizedUsername) &&
      (await checkUsernameTaken(admin, normalizedUsername));
    result.username = {
      taken: usernameTaken,
      suggestions: usernameTaken
        ? await buildUsernameSuggestions(admin, normalizedUsername, 3)
        : []
    };
  }

  if (normalizedEmail) {
    const emailTaken = await checkEmailTaken(admin, normalizedEmail);
    result.email = {
      taken: emailTaken
    };
  }

  return result;
}
