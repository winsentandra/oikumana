import type { Church, Locale } from "./types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Matches across every field a visitor might reasonably type: church name in
 * either language, parish, deanery, region and address. Token-based, so
 * "fatima glodok" finds the Glodok church by name and address together.
 */
export function searchChurches(all: Church[], query: string, locale: Locale): Church[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = all
    .map((church) => {
      const name = norm(church.name[locale]);
      const haystack = norm(
        [
          church.name.en,
          church.name.id,
          church.parish,
          church.deanery[locale],
          church.region,
          church.address,
        ].join(" ")
      );

      const matchesAll = tokens.every((tok) => haystack.includes(tok));
      if (!matchesAll) return null;

      // Rank a name hit above an address hit, and a prefix above a substring.
      let score = 0;
      for (const tok of tokens) {
        if (name.startsWith(tok)) score += 3;
        else if (name.includes(tok)) score += 2;
        else score += 1;
      }
      return { church, score };
    })
    .filter((x): x is { church: Church; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.church);
}
