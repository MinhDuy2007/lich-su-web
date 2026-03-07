"use client";

import type { FlexibleDateDraft } from "@/lib/event-editor";

interface FlexibleDateFieldsProps {
  label: string;
  value: FlexibleDateDraft;
  onChange: (nextValue: FlexibleDateDraft) => void;
}

function sanitizePart(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function FlexibleDateFields({ label, value, onChange }: FlexibleDateFieldsProps) {
  return (
    <fieldset className="space-y-2 rounded-2xl border border-border/70 bg-card/70 p-3">
      <legend className="px-1 text-xs font-semibold text-fg/75">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-fg/60">Ngày</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm"
            inputMode="numeric"
            onChange={(event) =>
              onChange({
                ...value,
                day: sanitizePart(event.target.value, 2)
              })
            }
            placeholder="VD: 07"
            value={value.day}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-fg/60">Tháng</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm"
            inputMode="numeric"
            onChange={(event) =>
              onChange({
                ...value,
                month: sanitizePart(event.target.value, 2)
              })
            }
            placeholder="VD: 03"
            value={value.month}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-wide text-fg/60">Năm</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm"
            inputMode="numeric"
            onChange={(event) =>
              onChange({
                ...value,
                year: sanitizePart(event.target.value, 4)
              })
            }
            placeholder={`VD: ${new Date().getFullYear()}`}
            value={value.year}
          />
        </label>
      </div>
    </fieldset>
  );
}
