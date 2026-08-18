"use client";

import type { Church, Locale } from "@/lib/types";

/**
 * The 72px row, shared by the search dropdown and both list views. The
 * hairline is drawn on the row rather than between rows so the last one in a
 * scrolling list keeps the same rhythm.
 */
export function ChurchRow({
  church,
  locale,
  onSelect,
  selected,
}: {
  church: Church;
  locale: Locale;
  onSelect: (slug: string) => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(church.slug)}
      aria-current={selected ? "true" : undefined}
      className={`h-9 w-full px-3 text-left transition-colors hover:bg-cream ${
        selected ? "bg-cream" : ""
      }`}
    >
      {/* The hairline is inset to the 24px content edge, so it sits on the
          inner wrapper rather than the full-bleed hit area. */}
      <span className="flex h-full flex-col justify-center gap-[2px] border-b border-stroke">
        <span className="truncate font-body text-base font-bold text-brown">
          {church.name[locale]}
        </span>
        <span className="flex items-center truncate font-ui text-sm text-warm">
          {church.parish}
          <span className="meta-dot" />
          {church.region}
        </span>
      </span>
    </button>
  );
}
