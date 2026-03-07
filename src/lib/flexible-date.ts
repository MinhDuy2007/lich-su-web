export type PartialDatePrecision =
  | "unknown"
  | "year"
  | "month"
  | "day"
  | "month_year"
  | "day_month"
  | "day_year"
  | "day_month_year";

export interface FlexibleDateInput {
  year?: unknown;
  month?: unknown;
  day?: unknown;
}

export interface FlexibleDateParts {
  year: number | null;
  month: number | null;
  day: number | null;
  precision: PartialDatePrecision;
  isoDate: string | null;
}

function normalizeInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (!/^\d+$/.test(trimmed)) {
      return Number.NaN;
    }

    return Number.parseInt(trimmed, 10);
  }

  return null;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function isLeapYear(year: number) {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

function getMaxDayOfMonth(month: number, year: number | null) {
  if ([1, 3, 5, 7, 8, 10, 12].includes(month)) {
    return 31;
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  if (month === 2) {
    return year && isLeapYear(year) ? 29 : 29;
  }

  return 31;
}

export function resolvePartialDatePrecision(input: FlexibleDateInput): PartialDatePrecision {
  const year = normalizeInteger(input.year);
  const month = normalizeInteger(input.month);
  const day = normalizeInteger(input.day);

  const hasYear = Number.isInteger(year);
  const hasMonth = Number.isInteger(month);
  const hasDay = Number.isInteger(day);

  if (hasDay && hasMonth && hasYear) return "day_month_year";
  if (hasMonth && hasYear) return "month_year";
  if (hasDay && hasMonth) return "day_month";
  if (hasDay && hasYear) return "day_year";
  if (hasYear) return "year";
  if (hasMonth) return "month";
  if (hasDay) return "day";
  return "unknown";
}

export function buildFlexibleDate(input: FlexibleDateInput): FlexibleDateParts {
  const year = normalizeInteger(input.year);
  const month = normalizeInteger(input.month);
  const day = normalizeInteger(input.day);
  const normalizedYear = Number.isInteger(year) ? year : null;
  const normalizedMonth = Number.isInteger(month) ? month : null;
  const normalizedDay = Number.isInteger(day) ? day : null;
  const precision = resolvePartialDatePrecision(input);

  const isoDate =
    precision === "day_month_year" && normalizedYear && normalizedMonth && normalizedDay
      ? `${normalizedYear}-${pad2(normalizedMonth)}-${pad2(normalizedDay)}`
      : null;

  return {
    year: normalizedYear,
    month: normalizedMonth,
    day: normalizedDay,
    precision,
    isoDate
  };
}

export function validateFlexibleDate(
  input: FlexibleDateInput,
  options?: {
    label?: string;
    now?: Date;
  }
) {
  const label = options?.label ?? "Mốc thời gian";
  const now = options?.now ?? new Date();
  const year = normalizeInteger(input.year);
  const month = normalizeInteger(input.month);
  const day = normalizeInteger(input.day);
  const errors: string[] = [];

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    errors.push(`${label} chỉ được nhập số.`);
    return errors;
  }

  if (year !== null && (year < 1 || year > 9999)) {
    errors.push(`${label}: năm phải nằm trong khoảng 1-9999.`);
  }

  if (month !== null && (month < 1 || month > 12)) {
    errors.push(`${label}: tháng phải nằm trong khoảng 1-12.`);
  }

  const maxDay = month ? getMaxDayOfMonth(month, year) : 31;
  if (day !== null && (day < 1 || day > maxDay)) {
    if (month) {
      errors.push(`${label}: ngày không hợp lệ cho tháng ${month}.`);
    } else {
      errors.push(`${label}: ngày phải nằm trong khoảng 1-31.`);
    }
  }

  const built = buildFlexibleDate({
    year,
    month,
    day
  });

  if (built.precision === "day_month_year" && built.isoDate) {
    const candidate = new Date(`${built.isoDate}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (candidate.getTime() > today.getTime()) {
      errors.push(`${label} không được vượt quá ngày hiện tại.`);
    }
  }

  return errors;
}

export function validateFlexibleDateRange(start: FlexibleDateInput, end: FlexibleDateInput) {
  const startBuilt = buildFlexibleDate(start);
  const endBuilt = buildFlexibleDate(end);

  if (!startBuilt.isoDate || !endBuilt.isoDate) {
    return [];
  }

  if (new Date(endBuilt.isoDate).getTime() < new Date(startBuilt.isoDate).getTime()) {
    return ["Mốc kết thúc không được sớm hơn mốc bắt đầu."];
  }

  return [];
}

export function formatFlexibleDate(input: FlexibleDateInput, fallbackDate?: string | null) {
  const built = buildFlexibleDate(input);

  switch (built.precision) {
    case "day_month_year":
      return built.day && built.month && built.year
        ? `${pad2(built.day)}/${pad2(built.month)}/${built.year}`
        : "Chưa rõ";
    case "month_year":
      return built.month && built.year ? `Tháng ${built.month}/${built.year}` : "Chưa rõ";
    case "day_month":
      return built.day && built.month ? `Ngày ${built.day}/${built.month}` : "Chưa rõ";
    case "day_year":
      return built.day && built.year ? `Ngày ${built.day}, năm ${built.year}` : "Chưa rõ";
    case "year":
      return built.year ? `Năm ${built.year}` : "Chưa rõ";
    case "month":
      return built.month ? `Tháng ${built.month}` : "Chưa rõ";
    case "day":
      return built.day ? `Ngày ${built.day}` : "Chưa rõ";
    default:
      break;
  }

  if (!fallbackDate) {
    return "Chưa rõ";
  }

  const date = new Date(fallbackDate);
  if (Number.isNaN(date.getTime())) {
    return fallbackDate;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatFlexibleDateRange(
  start: FlexibleDateInput,
  end: FlexibleDateInput,
  fallback?: {
    startDate?: string | null;
    endDate?: string | null;
  }
) {
  const startLabel = formatFlexibleDate(start, fallback?.startDate ?? null);
  const endLabel = formatFlexibleDate(end, fallback?.endDate ?? null);
  const startPrecision = resolvePartialDatePrecision(start);
  const endPrecision = resolvePartialDatePrecision(end);

  if (startPrecision === "unknown" && endPrecision === "unknown") {
    return "Chưa rõ mốc thời gian";
  }
  if (startPrecision !== "unknown" && endPrecision !== "unknown") {
    return `${startLabel} - ${endLabel}`;
  }
  if (startPrecision !== "unknown") {
    return `Từ ${startLabel}`;
  }

  return `Đến ${endLabel}`;
}
