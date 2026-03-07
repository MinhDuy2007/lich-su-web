"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";

interface SearchTagOption {
  id: string;
  name: string;
  slug: string;
}

interface SearchFormProps {
  tags: SearchTagOption[];
}

export function SearchForm({ tags }: SearchFormProps) {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params?.get("query") ?? "");
  const [selectedTag, setSelectedTag] = useState(params?.get("tag") ?? "");

  const tagOptions = useMemo(() => {
    const seen = new Set<string>();
    return tags.filter((tag) => {
      const normalized = tag.name.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }, [tags]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams = new URLSearchParams(params?.toString() ?? "");

    if (query.trim()) {
      nextParams.set("query", query.trim());
    } else {
      nextParams.delete("query");
    }

    if (selectedTag) {
      nextParams.set("tag", selectedTag);
    } else {
      nextParams.delete("tag");
    }

    // Legacy cleanup: search UI no longer uses event_type dropdown.
    nextParams.delete("eventType");
    nextParams.set("page", "1");
    router.push(`/tim-kiem?${nextParams.toString()}`);
  }

  return (
    <form
      className="card-glass flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center"
      onSubmit={onSubmit}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg/50" />
        <input
          className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none ring-primary/30 transition focus:ring-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nhập từ khóa sự kiện"
          value={query}
        />
      </div>

      <select
        className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
        onChange={(event) => setSelectedTag(event.target.value)}
        value={selectedTag}
      >
        <option value="">Tất cả</option>
        {tagOptions.map((tag) => (
          <option key={tag.id} value={tag.name}>
            #{tag.name}
          </option>
        ))}
      </select>

      <button
        className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-105"
        type="submit"
      >
        Tìm kiếm
      </button>
    </form>
  );
}
