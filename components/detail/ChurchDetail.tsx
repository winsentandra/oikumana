"use client";

import { MetaRow } from "./MetaRow";
import { ExpandableProse } from "./ExpandableProse";
import { TransitCard } from "./TransitCard";
import { AddressCard } from "./AddressCard";
import { formatConsecrated, t } from "@/lib/i18n";
import type { Church, Locale } from "@/lib/types";

export function ChurchDetail({
  church,
  /** Every church sharing this one's pin (including itself), in tab order.
   * Fewer than two entries means there's nothing to switch between. */
  siblings = [],
  onSwitch,
  locale,
  /** Desktop leads with the category, mobile with the parish. */
  eyebrow,
}: {
  church: Church;
  siblings?: Church[];
  onSwitch?: (slug: string) => void;
  locale: Locale;
  eyebrow: "category" | "parish";
}) {
  const directions =
    church.directionsUrl ??
    `https://www.google.com/maps/dir/?api=1&destination=${church.coords[0]},${church.coords[1]}`;

  return (
    <article className="flex flex-col gap-2 px-3 pt-3 pb-4">
      {siblings.length > 1 ? (
        <div role="tablist" className="-mb-1 flex gap-1">
          {siblings.map((sibling) => {
            const active = sibling.slug === church.slug;
            return (
              <button
                key={sibling.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSwitch?.(sibling.slug)}
                className={`h-[36px] shrink-0 rounded-card px-[12px] font-ui text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-maroon text-offwhite"
                    : "border border-stroke bg-offwhite text-brown hover:bg-cream"
                }`}
              >
                {sibling.parish.replace(/\s+Parish$/, "")}
              </button>
            );
          })}
        </div>
      ) : null}

      <header className="flex flex-col gap-[4px]">
        <p className="font-body text-lg font-bold text-maroon">
          {eyebrow === "category" ? church.category[locale] : church.parish}
        </p>
        {/* No text-balance: the mockup fills each line before wrapping. */}
        <h1 className="font-display text-3xl font-bold text-brown">
          {church.name[locale]}
        </h1>
      </header>

      {/* Article gap is 16px; pull this one up to 8px between title and
          infoboxes without touching the gaps around it. */}
      <div className="-mt-1 flex flex-col">
        <MetaRow label={t(locale, "deanery")} value={church.deanery[locale]} />
        {church.consecratedOn ? (
          <MetaRow
            label={t(locale, "consecrated")}
            value={formatConsecrated(church.consecratedOn, locale)}
          />
        ) : null}
      </div>

      {/* Keyed by slug so switching churches remounts this and drops any
          "read more" expansion from the previous church. */}
      <ExpandableProse
        key={church.slug}
        text={church.history[locale]}
        moreLabel={t(locale, "readMore")}
        lessLabel={t(locale, "readLess")}
      />

      {/* 24px between the prose block and the first card; the flex gap keeps
          the two cards 16px apart. */}
      <TransitCard
        className="mt-1"
        transits={church.transits}
        locale={locale}
        label={t(locale, "nearestTransits")}
      />

      <AddressCard
        address={church.address}
        href={directions}
        label={t(locale, "address")}
        directionsLabel={t(locale, "getDirections")}
      />
    </article>
  );
}
