"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

interface SourceOption {
  id: string;
  name: string;
  url: string | null;
}

interface SubmissionFormProps {
  sources: SourceOption[];
  tags: TagOption[];
}

interface SubmissionFormState {
  title: string;
  summary: string;
  content: string;
  startDay: string;
  startMonth: string;
  startYear: string;
  endDay: string;
  endMonth: string;
  endYear: string;
  locationText: string;
  country: string;
  selectedTagSlugs: string[];
  selectedSourceIds: string[];
  customSourcesInput: string;
  peopleInput: string;
  placesInput: string;
  imageUrlsInput: string;
}

const initialFormState: SubmissionFormState = {
  title: "",
  summary: "",
  content: "",
  startDay: "",
  startMonth: "",
  startYear: "",
  endDay: "",
  endMonth: "",
  endYear: "",
  locationText: "",
  country: "Việt Nam",
  selectedTagSlugs: [],
  selectedSourceIds: [],
  customSourcesInput: "",
  peopleInput: "",
  placesInput: "",
  imageUrlsInput: ""
};

interface ParsedCustomSource {
  name: string;
  url: string | null;
}

interface ParsedDate {
  day: number | null;
  month: number | null;
  year: number | null;
}

function sanitizeDatePart(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function parseStringList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/g)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function getMaxDay(month: number, year: number | null) {
  if ([1, 3, 5, 7, 8, 10, 12].includes(month)) {
    return 31;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  if (month === 2) {
    if (year === null) {
      return 29;
    }
    const isLeapYear = (year % 400 === 0 || year % 4 === 0) && year % 100 !== 0;
    return isLeapYear ? 29 : 28;
  }

  return 31;
}

function parseDate(day: string, month: string, year: string): ParsedDate {
  return {
    day: parseOptionalInteger(day),
    month: parseOptionalInteger(month),
    year: parseOptionalInteger(year)
  };
}

function validateDate(date: ParsedDate, label: string) {
  if (date.month !== null && (date.month < 1 || date.month > 12)) {
    return `${label}: tháng phải nằm trong khoảng 1-12.`;
  }

  if (date.day !== null) {
    const maxDay = date.month ? getMaxDay(date.month, date.year) : 31;
    if (date.day < 1 || date.day > maxDay) {
      return date.month
        ? `${label}: ngày không hợp lệ cho tháng ${date.month}.`
        : `${label}: ngày phải nằm trong khoảng 1-31.`;
    }
  }

  if (date.year !== null && (date.year < 1 || date.year > 9999)) {
    return `${label}: năm phải nằm trong khoảng 1-9999.`;
  }

  if (date.day !== null && date.month !== null && date.year !== null) {
    const selected = new Date(date.year, date.month - 1, date.day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selected.getTime() > today.getTime()) {
      return `${label} không được vượt quá ngày hiện tại.`;
    }
  }

  return null;
}

function validateDateRange(start: ParsedDate, end: ParsedDate) {
  if (
    start.day === null ||
    start.month === null ||
    start.year === null ||
    end.day === null ||
    end.month === null ||
    end.year === null
  ) {
    return null;
  }

  const startDate = new Date(start.year, start.month - 1, start.day);
  const endDate = new Date(end.year, end.month - 1, end.day);
  if (endDate.getTime() < startDate.getTime()) {
    return "Mốc kết thúc không được sớm hơn mốc bắt đầu.";
  }

  return null;
}

function parseCustomSources(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: ParsedCustomSource[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const [rawName, ...urlParts] = line.split("|");
    const name = rawName?.trim() ?? "";
    const urlCandidate = urlParts.join("|").trim();

    if (!name) {
      return {
        items: [],
        error: `Dòng ${index + 1}: thiếu tên nguồn.`
      };
    }

    if (urlCandidate && !/^https?:\/\/\S+$/i.test(urlCandidate)) {
      return {
        items: [],
        error: `Dòng ${index + 1}: URL không hợp lệ.`
      };
    }

    const dedupeKey = `${name.toLowerCase()}|${urlCandidate.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    items.push({
      name,
      url: urlCandidate || null
    });
  }

  return {
    items,
    error: null as string | null
  };
}

function normalizeApiError(message: unknown) {
  if (typeof message !== "string" || !message.trim()) {
    return "Không thể gửi đề xuất. Vui lòng thử lại.";
  }

  if (message.includes("\uFFFD") || /(?:\u00C3|\u00C2|\u00C4)/.test(message)) {
    return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường và gửi lại.";
  }

  return message;
}

export function SubmissionForm({ sources, tags }: SubmissionFormProps) {
  const [form, setForm] = useState<SubmissionFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTagSet = useMemo(() => new Set(form.selectedTagSlugs), [form.selectedTagSlugs]);
  const selectedSourceSet = useMemo(() => new Set(form.selectedSourceIds), [form.selectedSourceIds]);

  function toggleTag(tagSlug: string) {
    setForm((prev) => {
      const exists = prev.selectedTagSlugs.includes(tagSlug);
      return {
        ...prev,
        selectedTagSlugs: exists
          ? prev.selectedTagSlugs.filter((item) => item !== tagSlug)
          : [...prev.selectedTagSlugs, tagSlug]
      };
    });
  }

  function toggleSource(sourceId: string) {
    setForm((prev) => {
      const exists = prev.selectedSourceIds.includes(sourceId);
      return {
        ...prev,
        selectedSourceIds: exists
          ? prev.selectedSourceIds.filter((item) => item !== sourceId)
          : [...prev.selectedSourceIds, sourceId]
      };
    });
  }

  function setStartDatePart(part: "startDay" | "startMonth" | "startYear", value: string) {
    const maxLength = part.endsWith("Year") ? 4 : 2;
    setForm((prev) => ({
      ...prev,
      [part]: sanitizeDatePart(value, maxLength)
    }));
  }

  function setEndDatePart(part: "endDay" | "endMonth" | "endYear", value: string) {
    const maxLength = part.endsWith("Year") ? 4 : 2;
    setForm((prev) => ({
      ...prev,
      [part]: sanitizeDatePart(value, maxLength)
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const summary = form.summary.trim();
    const content = form.content.trim();

    if (title.length < 3) {
      toast.error("Tiêu đề cần ít nhất 3 ký tự.");
      return;
    }

    if (summary.length < 10) {
      toast.error("Tóm tắt cần ít nhất 10 ký tự.");
      return;
    }

    if (content.length < 20) {
      toast.error("Nội dung cần ít nhất 20 ký tự.");
      return;
    }

    const startDate = parseDate(form.startDay, form.startMonth, form.startYear);
    const endDate = parseDate(form.endDay, form.endMonth, form.endYear);

    const startDateError = validateDate(startDate, "Mốc bắt đầu");
    if (startDateError) {
      toast.error(startDateError);
      return;
    }

    const endDateError = validateDate(endDate, "Mốc kết thúc");
    if (endDateError) {
      toast.error(endDateError);
      return;
    }

    const rangeError = validateDateRange(startDate, endDate);
    if (rangeError) {
      toast.error(rangeError);
      return;
    }

    const customSourcesResult = parseCustomSources(form.customSourcesInput);
    if (customSourcesResult.error) {
      toast.error(customSourcesResult.error);
      return;
    }

    const imageUrls = parseStringList(form.imageUrlsInput);
    const invalidImageUrl = imageUrls.find((url) => !/^https?:\/\/\S+$/i.test(url));
    if (invalidImageUrl) {
      toast.error("Danh sách ảnh chứa URL không hợp lệ.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/events/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          summary,
          content,
          startDay: startDate.day,
          startMonth: startDate.month,
          startYear: startDate.year,
          endDay: endDate.day,
          endMonth: endDate.month,
          endYear: endDate.year,
          eventType: form.selectedTagSlugs[0] ?? null,
          locationText: form.locationText.trim() || null,
          country: form.country.trim() || null,
          tags: form.selectedTagSlugs,
          people: parseStringList(form.peopleInput),
          places: parseStringList(form.placesInput),
          sourceIds: form.selectedSourceIds,
          customSources: customSourcesResult.items,
          imageUrls
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            message?: string;
          }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(normalizeApiError(payload?.message));
      }

      toast.success("Đã gửi đề xuất. Đội ngũ kiểm duyệt sẽ xem xét sớm.");
      setForm(initialFormState);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi đề xuất. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card-glass rounded-2xl p-5">
      <header className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">Gửi đề xuất sự kiện</h2>
        <p className="text-xs text-fg/65">
          Điền thông tin rõ ràng để đội ngũ kiểm duyệt xác minh và xuất bản nhanh hơn.
        </p>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-fg/70">Tiêu đề</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Nhập tiêu đề sự kiện"
              value={form.title}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-fg/70">Địa điểm</span>
            <input
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  locationText: event.target.value
                }))
              }
              placeholder="Ví dụ: Hà Nội"
              value={form.locationText}
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-fg/70">Tóm tắt ngắn</span>
          <textarea
            className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
            placeholder="Mô tả ngắn gọn nội dung chính"
            value={form.summary}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-fg/70">Nội dung chi tiết</span>
          <textarea
            className="min-h-[180px] w-full rounded-xl border border-border bg-card p-3 text-sm leading-6"
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="Viết nội dung chi tiết, mốc chính, bối cảnh và kết quả của sự kiện"
            value={form.content}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
            <legend className="px-1 text-xs font-semibold text-fg/75">Mốc bắt đầu</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setStartDatePart("startDay", event.target.value)}
                placeholder="Ngày"
                value={form.startDay}
              />
              <input
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setStartDatePart("startMonth", event.target.value)}
                placeholder="Tháng"
                value={form.startMonth}
              />
              <input
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setStartDatePart("startYear", event.target.value)}
                placeholder="Năm"
                value={form.startYear}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
            <legend className="px-1 text-xs font-semibold text-fg/75">Mốc kết thúc</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setEndDatePart("endDay", event.target.value)}
                placeholder="Ngày"
                value={form.endDay}
              />
              <input
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setEndDatePart("endMonth", event.target.value)}
                placeholder="Tháng"
                value={form.endMonth}
              />
              <input
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setEndDatePart("endYear", event.target.value)}
                placeholder="Năm"
                value={form.endYear}
              />
            </div>
          </fieldset>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-fg/70">Quốc gia</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            placeholder="Ví dụ: Việt Nam"
            value={form.country}
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-fg/70">Thẻ sự kiện</legend>
          {tags.length === 0 ? (
            <p className="text-xs text-fg/60">Chưa có thẻ nào để chọn.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTagSet.has(tag.slug);
                return (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      selected
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card text-fg/80 hover:border-primary/40"
                    )}
                    key={tag.id}
                    onClick={() => toggleTag(tag.slug)}
                    type="button"
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-fg/70">Nguồn tham khảo có sẵn</legend>
          {sources.length === 0 ? (
            <p className="text-xs text-fg/60">Chưa có nguồn nào trong hệ thống.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.map((source) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                  key={source.id}
                >
                  <span className="line-clamp-1 text-fg/85">{source.name}</span>
                  <input
                    checked={selectedSourceSet.has(source.id)}
                    onChange={() => toggleSource(source.id)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-fg/70">Nguồn tự nhập (mỗi dòng: Tên | URL)</span>
          <textarea
            className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                customSourcesInput: event.target.value
              }))
            }
            placeholder={"Ví dụ:\nBáo Nhân Dân | https://nhandan.vn\nWikipedia | https://vi.wikipedia.org"}
            value={form.customSourcesInput}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-fg/70">Nhân vật liên quan</span>
            <textarea
              className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, peopleInput: event.target.value }))}
              placeholder="Ngăn cách bằng dấu phẩy hoặc xuống dòng"
              value={form.peopleInput}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-fg/70">Địa danh liên quan</span>
            <textarea
              className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
              onChange={(event) => setForm((prev) => ({ ...prev, placesInput: event.target.value }))}
              placeholder="Ngăn cách bằng dấu phẩy hoặc xuống dòng"
              value={form.placesInput}
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-fg/70">Ảnh minh họa (mỗi dòng một URL)</span>
          <textarea
            className="h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                imageUrlsInput: event.target.value
              }))
            }
            placeholder="https://example.com/image-1.jpg"
            value={form.imageUrlsInput}
          />
        </label>

        <button
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang gửi đề xuất..." : "Gửi đề xuất"}
        </button>
      </form>
    </section>
  );
}