"use client";

import { BrandPill } from "./BrandPill";
import { IconPill } from "./IconPill";
import { LanguageMenu } from "./LanguageMenu";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

/**
 * Desktop: the cluster floats at the top-right, 16px in, reading
 * brand · About · Language.
 *
 * Mobile: it spans the full width and re-orders to About · brand · Language,
 * with the two controls collapsed to icon squares and the brand taking the
 * remaining space.
 *
 * It deliberately sits *below* the scrim in the stacking order, so opening
 * the list, search or the about modal dims the chrome along with the map —
 * which is what the mockups show.
 */
export function HeaderCluster({
  locale,
  onLocaleChange,
  onAbout,
}: {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  onAbout: () => void;
}) {
  return (
    <div className="pointer-events-none isolate fixed inset-x-2 top-2 z-10 flex items-start gap-1 md:inset-x-auto md:right-2 md:left-auto">
      <div className="pointer-events-auto order-1 md:order-2">
        <IconPill
          icon="about"
          label={t(locale, "about")}
          srLabel={t(locale, "openAbout")}
          onClick={onAbout}
        />
      </div>

      <BrandPill className="pointer-events-auto order-2 min-w-0 flex-1 md:order-1 md:flex-none" />

      <div className="pointer-events-auto order-3">
        <LanguageMenu
          locale={locale}
          onChange={onLocaleChange}
          label={t(locale, "changeLanguage")}
        />
      </div>
    </div>
  );
}
