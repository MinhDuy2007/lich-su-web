import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const DEFAULT_BUCKET = "event-images";

function getImageBucketName() {
  const configured = process.env.SUPABASE_EVENT_IMAGES_BUCKET?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BUCKET;
}

function buildImagePath(userId: string, fileName: string) {
  const cleaned = fileName.trim().toLowerCase();
  const ext = cleaned.includes(".") ? cleaned.split(".").pop() ?? "jpg" : "jpg";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  return `${userId}/${Date.now()}-${randomUUID()}.${safeExt}`;
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ["admin", "moderator", "user"]);
  if (!access.ok || !access.userId) {
    return fail("Không đủ quyền", access.status);
  }

  const formData = await request.formData();
  const fileCandidate = formData.get("image");
  if (!fileCandidate || typeof fileCandidate === "string") {
    return fail("Thiếu tệp ảnh", 400);
  }

  if (!fileCandidate.type.startsWith("image/")) {
    return fail("Chỉ chấp nhận tệp ảnh", 400);
  }
  if (fileCandidate.size > MAX_IMAGE_SIZE_BYTES) {
    return fail("Ảnh vượt quá dung lượng 8MB", 400);
  }

  const bucketName = getImageBucketName();
  const imagePath = buildImagePath(access.userId, fileCandidate.name);
  const fileBuffer = Buffer.from(await fileCandidate.arrayBuffer());
  const admin = createSupabaseAdmin();
  const uploadResult = await admin.storage.from(bucketName).upload(imagePath, fileBuffer, {
    contentType: fileCandidate.type,
    upsert: false
  });

  if (uploadResult.error) {
    return fail(
      "Kh?ng t?i du?c ?nh. H?y ki?m tra bucket luu tr? s? ki?n",
      500,
      uploadResult.error.message
    );
  }

  const publicUrl = admin.storage.from(bucketName).getPublicUrl(imagePath).data.publicUrl;
  if (!publicUrl) {
    return fail("Không lấy được liên kết ảnh", 500);
  }

  return ok({
    url: publicUrl,
    path: imagePath,
    bucket: bucketName
  });
}
