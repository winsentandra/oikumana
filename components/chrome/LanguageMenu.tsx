"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconPill } from "./IconPill";
import { locales } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function LanguageMenu({
  locale,
  onChange,
  label,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  return (
    <div ref={wrapRef} className="relative">
      <IconPill
        ref={triggerRef}
        icon="language"
        label={current.label}
        srLabel={label}
        expanded={open}
        onClick={() => setOpen((v) => !v)}
        trailing={
          <Icon
            name="chevron-down"
            className={`hidden text-brown transition-transform md:block ${open ? "rotate-180" : ""}`}
          />
        }
      />
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute top-full right-0 mt-1 min-w-[var(--spacing-lang-menu,200px)] overflow-hidden rounded-card bg-offwhite py-1 shadow-panel"
        >
          {locales.map((l) => {
            const selected = l.code === locale;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`flex w-full items-center px-[12px] py-1 text-left font-ui text-base whitespace-nowrap transition-colors hover:bg-cream ${
                    selected ? "text-maroon" : "text-brown"
                  }`}
                >
                  {l.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
