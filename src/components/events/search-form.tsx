"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";

export function SearchForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params?.get("query") ?? "");
  const [eventType, setEventType] = useState(params?.get("eventType") ?? "");

  const types = useMemo(
    () => ["chien-tranh", "chinh-tri", "khoa-hoc", "van-hoa", "kinh-te", "khac"],
    []
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams = new URLSearchParams(params?.toString() ?? "");
    if (query) {
      nextParams.set("query", query);
    } else {
      nextParams.delete("query");
    }
    if (eventType) {
      nextParams.set("eventType", eventType);
    } else {
      nextParams.delete("eventType");
    }
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
          placeholder="Nhap tu khoa su kien"
          value={query}
        />
      </div>
      <select
        className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
        onChange={(event) => setEventType(event.target.value)}
        value={eventType}
      >
        <option value="">Tat ca loai su kien</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <button
        className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-105"
        type="submit"
      >
        Tim kiem
      </button>
    </form>
  );
}
