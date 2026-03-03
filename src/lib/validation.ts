import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{4,30}$/, "Username chi cho phep a-z0-9_ tu 4-30 ky tu");

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    otpRequestId: z.string().uuid(),
    otpCode: z.string().regex(/^\d{6,8}$/),
    captchaSessionId: z.string().uuid(),
    captchaAnswer: z.string().min(4).max(12)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Mat khau xac nhan khong trung",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8).max(128),
  captchaSessionId: z.string().uuid(),
  captchaAnswer: z.string().min(4).max(12)
});

export const otpSendSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["register", "forgot_password"])
});

export const otpVerifySchema = z.object({
  otpRequestId: z.string().uuid(),
  otpCode: z.string().regex(/^\d{6,8}$/)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  captchaSessionId: z.string().uuid(),
  captchaAnswer: z.string().min(4).max(12)
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    otpRequestId: z.string().uuid(),
    otpCode: z.string().regex(/^\d{6,8}$/),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128)
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Mat khau xac nhan khong trung",
    path: ["confirmPassword"]
  });

export const eventSearchSchema = z.object({
  query: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  eventType: z.string().optional(),
  person: z.string().optional(),
  place: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12)
});

export const aiSummarizeSchema = z.object({
  eventId: z.string().uuid(),
  style: z.enum(["paragraph", "bullets"]).default("paragraph"),
  length: z.enum(["short", "medium", "long"]).default("short")
});

export const aiAskSchema = z.object({
  eventId: z.string().uuid(),
  question: z.string().trim().min(3).max(1000)
});

export const eventCrudSchema = z.object({
  slug: z.string().trim().min(3).max(160),
  title: z.string().trim().min(3).max(255),
  summary: z.string().trim().min(3).max(1000),
  content: z.string().trim().min(10),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  eventType: z.string().nullable().optional(),
  locationText: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  status: z.enum(["draft", "pending", "published", "rejected"]),
  tags: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  places: z.array(z.string()).default([]),
  sourceIds: z.array(z.string().uuid()).default([]),
  imageUrls: z.array(z.string().url()).default([])
});

export const moderationActionSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional()
});

export const userBanSchema = z.object({
  userId: z.string().uuid(),
  isBanned: z.boolean(),
  reason: z.string().max(255).optional()
});

export const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "moderator", "admin"])
});

export const sourceSchema = z.object({
  name: z.string().min(2).max(255),
  url: z.string().url().nullable().optional()
});

export const tagSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80)
});

export const ipBanSchema = z.object({
  ipAddress: z.string().min(7).max(64),
  reason: z.string().max(255).optional(),
  isActive: z.boolean().default(true)
});
