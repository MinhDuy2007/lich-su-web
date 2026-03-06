import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { getAuthUserFromRequest } from "@/lib/auth";
import { readClientIp } from "@/lib/ip-ban";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { profileUpdateSchema } from "@/lib/validation";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

async function getBookmarkCount(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const bookmarksResult = await admin
    .from("event_bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!bookmarksResult.error) {
    return bookmarksResult.count ?? 0;
  }

  if (bookmarksResult.error.code === "42P01") {
    const legacyResult = await admin
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (legacyResult.error) {
      throw legacyResult.error;
    }
    return legacyResult.count ?? 0;
  }

  throw bookmarksResult.error;
}

async function getContributionCount(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const result = await admin
    .from("event_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", userId)
    .eq("status", "approved");

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

function buildAvatarPath(userId: string, fileName: string) {
  const cleaned = fileName.trim().toLowerCase();
  const ext = cleaned.includes(".") ? cleaned.split(".").pop() ?? "png" : "png";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "png";
  return `${userId}/${Date.now()}-${randomUUID()}.${safeExt}`;
}

export async function GET(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Cần đăng nhập", 401);
  }

  const admin = createSupabaseAdmin();
  const profileResult = await admin
    .from("profiles")
    .select("user_id,username,email,display_name,avatar_url,created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return fail("Không tìm thấy hồ sơ", 404, profileResult.error?.message);
  }

  const [bookmarkCount, contributionCount] = await Promise.all([
    getBookmarkCount(admin, user.id),
    getContributionCount(admin, user.id)
  ]);

  return ok({
    ...profileResult.data,
    bookmarkCount,
    contributionCount
  });
}

export async function PATCH(request: NextRequest) {
  const { user } = await getAuthUserFromRequest(request);
  if (!user) {
    return fail("Cần đăng nhập", 401);
  }

  const ip = readClientIp(request) ?? "unknown";
  const limiter = checkRateLimit({
    key: `account:profile:update:${user.id}:${ip}`,
    limit: 15,
    windowMs: 60_000
  });
  if (!limiter.allowed) {
    return fail("Bạn cập nhật quá nhanh", 429);
  }

  const formData = await request.formData();
  const displayNameRaw = String(formData.get("displayName") ?? "");
  const parsed = profileUpdateSchema.safeParse({
    displayName: displayNameRaw
  });
  if (!parsed.success) {
    return fail(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
  }

  const admin = createSupabaseAdmin();
  const updatePayload: {
    display_name: string;
    avatar_url?: string;
    updated_at: string;
  } = {
    display_name: parsed.data.displayName,
    updated_at: new Date().toISOString()
  };

  const avatarFileCandidate = formData.get("avatar");
  if (avatarFileCandidate && typeof avatarFileCandidate !== "string") {
    if (!avatarFileCandidate.type.startsWith("image/")) {
      return fail("Ảnh đại diện phải là file ảnh", 400);
    }
    if (avatarFileCandidate.size > MAX_AVATAR_SIZE_BYTES) {
      return fail("Ảnh đại diện vượt quá 2MB", 400);
    }

    const avatarPath = buildAvatarPath(user.id, avatarFileCandidate.name);
    const fileBuffer = Buffer.from(await avatarFileCandidate.arrayBuffer());
    const uploadResult = await admin.storage
      .from("avatars")
      .upload(avatarPath, fileBuffer, {
        contentType: avatarFileCandidate.type,
        upsert: true
      });

    if (uploadResult.error) {
      return fail("Không upload được ảnh đại diện", 500, uploadResult.error.message);
    }

    const publicUrl = admin.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
    updatePayload.avatar_url = publicUrl;
  }

  const updateResult = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", user.id)
    .select("user_id,username,email,display_name,avatar_url,created_at")
    .single();

  if (updateResult.error) {
    return fail("Không cập nhật được hồ sơ", 500, updateResult.error.message);
  }

  const [bookmarkCount, contributionCount] = await Promise.all([
    getBookmarkCount(admin, user.id),
    getContributionCount(admin, user.id)
  ]);

  return ok({
    ...updateResult.data,
    bookmarkCount,
    contributionCount
  });
}
