"use client";

import { ChurchRow } from "@/components/panel/ChurchRow";
import { t } from "@/lib/i18n";
import type { Church, Locale } from "@/lib/types";

export function SearchResults({
  results,
  locale,
  onSelect,
  query,
  bleed = false,
}: {
  results: Church[];
  locale: Locale;
  onSelect: (slug: string) => void;
  query: string;
  /** Full-bleed, no card/shadow — for the mobile full-screen search takeover,
   * which already supplies its own opaque background. */
  bleed?: boolean;
}) {
  if (!query.trim()) return null;

  return (
    <div
      className={
        bleed
          ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
          : "mt-1 max-h-[min(45vh,360px)] overflow-y-auto overscroll-contain rounded-card bg-offwhite shadow-panel"
      }
    >
      {results.length === 0 ? (
        <div className="flex flex-col gap-[4px] px-3 py-3">
          <p className="font-body text-base font-bold text-brown">
            {t(locale, "noResults")}
          </p>
          <p className="font-ui text-sm text-warm">{t(locale, "noResultsHint")}</p>
        </div>
      ) : (
        <ul>
          {results.map((church) => (
            <li key={church.slug} className="last:[&>button]:border-b-0">
              <ChurchRow church={church} locale={locale} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
