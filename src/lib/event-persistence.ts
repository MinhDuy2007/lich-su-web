import type { AppRole } from "@/lib/roles";
import { buildFlexibleDate } from "@/lib/flexible-date";

interface FlexibleEventDatePayload {
  startYear?: unknown;
  startMonth?: unknown;
  startDay?: unknown;
  endYear?: unknown;
  endMonth?: unknown;
  endDay?: unknown;
}

export function buildEventDateColumns(input: FlexibleEventDatePayload) {
  const start = buildFlexibleDate({
    year: input.startYear,
    month: input.startMonth,
    day: input.startDay
  });
  const end = buildFlexibleDate({
    year: input.endYear,
    month: input.endMonth,
    day: input.endDay
  });

  return {
    start_date: start.isoDate,
    end_date: end.isoDate,
    start_year: start.year,
    start_month: start.month,
    start_day: start.day,
    start_precision: start.precision,
    end_year: end.year,
    end_month: end.month,
    end_day: end.day,
    end_precision: end.precision
  };
}

export function getDefaultEventStatusForRole(role: AppRole | null | undefined) {
  return role === "admin" ? "published" : "pending";
}
