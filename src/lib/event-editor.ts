export interface CustomSourceDraft {
  name: string;
  url: string | null;
}

export interface FlexibleDateDraft {
  day: string;
  month: string;
  year: string;
}

export interface EventEditorFormState {
  title: string;
  summary: string;
  content: string;
  startDate: FlexibleDateDraft;
  endDate: FlexibleDateDraft;
  eventType: string;
  locationText: string;
  country: string;
  tags: string[];
  sourceIds: string[];
  customSourcesInput: string;
  peopleInput: string;
  placesInput: string;
  imageUrlsInput: string;
}

export const emptyFlexibleDateDraft: FlexibleDateDraft = {
  day: "",
  month: "",
  year: ""
};

export const emptyEventEditorFormState: EventEditorFormState = {
  title: "",
  summary: "",
  content: "",
  startDate: { ...emptyFlexibleDateDraft },
  endDate: { ...emptyFlexibleDateDraft },
  eventType: "",
  locationText: "",
  country: "",
  tags: [],
  sourceIds: [],
  customSourcesInput: "",
  peopleInput: "",
  placesInput: "",
  imageUrlsInput: ""
};

export function parseListInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/g)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

export function parseCustomSourcesInput(value: string) {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: CustomSourceDraft[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  entries.forEach((entry, index) => {
    const [rawName, ...urlParts] = entry.split("|");
    const name = rawName?.trim() ?? "";
    const url = urlParts.join("|").trim();

    if (!name) {
      errors.push(`Dòng ${index + 1}: thiếu tên nguồn.`);
      return;
    }

    if (url && !/^https?:\/\/\S+$/i.test(url)) {
      errors.push(`Dòng ${index + 1}: URL không hợp lệ.`);
      return;
    }

    const dedupeKey = `${name.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);

    items.push({
      name,
      url: url || null
    });
  });

  return { items, errors };
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
