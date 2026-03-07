import { z } from "zod";
import { validateFlexibleDate, validateFlexibleDateRange } from "@/lib/flexible-date";

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{4,30}$/, "Username chỉ cho phép a-z0-9_ từ 4-30 ký tự");

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    otpRequestId: z.string().uuid(),
    otpCode: z.string().regex(/^\d{8}$/, "OTP phải gồm đúng 8 chữ số"),
    captchaSessionId: z.string().uuid(),
    captchaAnswer: z.string().min(4).max(12)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng",
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
    message: "Mật khẩu xác nhận không trùng",
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

const optionalPartialNumber = z.preprocess((value) => {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isInteger(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().nullable().optional());

export const eventCrudSchema = z.object({
  slug: z.string().trim().max(160).nullable().optional(),
  title: z.string().trim().min(3).max(255),
  summary: z.string().trim().min(3).max(1000),
  content: z.string().trim().min(10),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  startYear: optionalPartialNumber,
  startMonth: optionalPartialNumber,
  startDay: optionalPartialNumber,
  endYear: optionalPartialNumber,
  endMonth: optionalPartialNumber,
  endDay: optionalPartialNumber,
  eventType: z.string().nullable().optional(),
  locationText: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  status: z.enum(["draft", "pending", "published", "rejected"]).optional(),
  tags: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  places: z.array(z.string()).default([]),
  sourceIds: z.array(z.string().uuid()).default([]),
  customSources: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(255),
        url: z.string().trim().url().nullable().optional()
      })
    )
    .default([]),
  imageUrls: z.array(z.string().url()).default([])
}).superRefine((value, ctx) => {
  const startErrors = validateFlexibleDate(
    {
      year: value.startYear,
      month: value.startMonth,
      day: value.startDay
    },
    {
      label: "Mốc bắt đầu"
    }
  );
  const endErrors = validateFlexibleDate(
    {
      year: value.endYear,
      month: value.endMonth,
      day: value.endDay
    },
    {
      label: "Mốc kết thúc"
    }
  );
  const rangeErrors = validateFlexibleDateRange(
    {
      year: value.startYear,
      month: value.startMonth,
      day: value.startDay
    },
    {
      year: value.endYear,
      month: value.endMonth,
      day: value.endDay
    }
  );

  [...startErrors, ...endErrors, ...rangeErrors].forEach((message) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message
    });
  });
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

export const commentCreateSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional()
});

export const eventReportCreateSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  detail: z.string().trim().max(2000).optional()
});

export const reportReviewSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["reviewing", "resolved", "rejected"]),
  response: z.string().trim().min(3).max(1000),
  changesApplied: z.string().trim().max(1000).optional()
});

export const notificationsMarkReadSchema = z
  .object({
    ids: z.array(z.string().uuid()).max(100).optional(),
    markAll: z.boolean().default(false)
  })
  .refine((value) => value.markAll || (value.ids?.length ?? 0) > 0, {
    message: "Thiếu danh sách thông báo cần cập nhật"
  });

export const adminBroadcastSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(1000),
  link: z.string().trim().max(300).optional()
});

export const supportRequestSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(30)
    .regex(/^[0-9+\s().-]+$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(10).max(3000)
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80)
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
    confirmNewPassword: z.string().min(8).max(128)
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Mật khẩu xác nhận không trùng",
    path: ["confirmNewPassword"]
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Mật khẩu mới không được trùng mật khẩu hiện tại",
    path: ["newPassword"]
  });
