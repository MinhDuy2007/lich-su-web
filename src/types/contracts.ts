export interface EventDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  startDate: string | null;
  endDate: string | null;
  eventType: string | null;
  locationText: string | null;
  country: string | null;
  status: "draft" | "pending" | "published" | "rejected";
  tags: string[];
  people: string[];
  places: string[];
  imageUrls: string[];
  sources: Array<{
    id: string;
    name: string;
    url: string | null;
  }>;
}

export interface EventSearchQuery {
  query?: string;
  fromDate?: string;
  toDate?: string;
  eventType?: string;
  person?: string;
  place?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface EventFilter {
  query?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
  eventType?: string;
  person?: string;
  place?: string;
  tags?: string[];
}

export interface AuthRegisterInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  otpRequestId: string;
  otpCode: string;
  captchaSessionId: string;
  captchaAnswer: string;
}

export interface AuthLoginInput {
  username: string;
  password: string;
  captchaSessionId: string;
  captchaAnswer: string;
}

export interface OtpSendInput {
  email: string;
  purpose: "register" | "forgot_password";
}

export interface OtpVerifyInput {
  otpRequestId: string;
  otpCode: string;
}

export interface AiSummarizeInput {
  eventId: string;
  style: "paragraph" | "bullets";
  length: "short" | "medium" | "long";
}

export interface AiAskInput {
  eventId: string;
  question: string;
}

export interface AdminModerationAction {
  submissionId: string;
  action: "approve" | "reject";
  note?: string;
}

export interface UserBanAction {
  userId: string;
  isBanned: boolean;
  reason?: string;
}

