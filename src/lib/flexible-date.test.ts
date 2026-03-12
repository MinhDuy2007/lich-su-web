import { describe, expect, it } from "vitest";
import { formatFlexibleDateRange } from "@/lib/flexible-date";

describe("formatFlexibleDateRange", () => {
  it("dùng fallback start_date khi thiếu cột partial date", () => {
    const label = formatFlexibleDateRange(
      {
        day: null,
        month: null,
        year: null
      },
      {
        day: null,
        month: null,
        year: null
      },
      {
        startDate: "1975-04-30",
        endDate: null
      }
    );

    expect(label).toBe("Từ 30/04/1975");
  });

  it("dùng fallback cho cả khoảng thời gian", () => {
    const label = formatFlexibleDateRange(
      {
        day: null,
        month: null,
        year: null
      },
      {
        day: null,
        month: null,
        year: null
      },
      {
        startDate: "1945-09-02",
        endDate: "1945-09-03"
      }
    );

    expect(label).toBe("02/09/1945 - 03/09/1945");
  });
});
