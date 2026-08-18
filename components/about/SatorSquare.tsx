"use client";

import { useEffect, useState } from "react";

const ROWS = ["SATOR", "AREPO", "TENET", "OPERA", "ROTAS"];
const STEP_MS = 1100;

/**
 * The Sator square — a Latin palindrome that reads the same across and down.
 * Rendered as a real grid so the columns line up exactly, which is the whole
 * point of the device.
 *
 * "Diagonal symmetry pulse": every ~1.1s, row i and column i (they cross at
 * one tile) cut instantly to the accent colour — no transition — while
 * everything else stays neutral. i loops 0-4.
 */
export function SatorSquare() {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [active, setActive] = useState<number | null>(reducedMotion ? null : 0);

  useEffect(() => {
    if (reducedMotion) return;

    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 5;
      setActive(i);
    }, STEP_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-label={ROWS.join(" ")} role="img" className="w-fit">
      {ROWS.map((row, rowIndex) => (
        <div key={row} className="grid grid-cols-5">
          {row.split("").map((letter, colIndex) => {
            const isActive = active !== null && (active === rowIndex || active === colIndex);
            return (
              <span
                key={colIndex}
                aria-hidden="true"
                className="relative flex h-[28px] w-[28px] items-center justify-center"
              >
                {/* Highlight insets 1px each side (28 -> 26) so adjacent
                    active tiles keep a hairline gap instead of touching. */}
                {isActive ? (
                  <span className="absolute inset-[1px] rounded-[4px] bg-maroon" />
                ) : null}
                <span
                  className={`relative text-center font-display text-xl font-bold ${
                    isActive ? "text-offwhite" : "text-maroon"
                  }`}
                >
                  {letter}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
