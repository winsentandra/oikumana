"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { SatorSquare } from "./SatorSquare";
import { PORTFOLIO_URL, t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

/** Renders **bold** spans without pulling in a markdown dependency. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

export function AboutModal({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !card.current) return;

      const focusable = card.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const body = t(locale, "aboutBody") as readonly string[];
  const whoBody = t(locale, "aboutWhoBody") as readonly string[];

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-2 md:items-center md:p-2">
      <button
        type="button"
        aria-label={t(locale, "closePanel")}
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />

      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={t(locale, "openAbout")}
        className="relative flex max-h-[calc(100dvh-16px)] w-full flex-col overflow-hidden rounded-t-card bg-offwhite md:max-h-[min(700px,calc(100dvh-32px))] md:max-w-[640px] md:rounded-card"
      >
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label={t(locale, "closePanel")}
          className="absolute top-2 right-2 z-10 grid size-6 place-items-center rounded-full bg-cream text-brown transition-colors hover:bg-stroke"
        >
          <Icon name="close" />
        </button>

        <div className="no-scrollbar overflow-y-auto overscroll-contain p-3">
          <SatorSquare />

          <h2 className="mt-3 font-body text-lg font-bold text-maroon">
            {t(locale, "aboutTitle")}
          </h2>
          <div className="prose-book font-body text-base text-brown">
            {body.map((p, i) => (
              <p key={i}>
                <RichText text={p} />
              </p>
            ))}
          </div>

          <h2 className="mt-3 font-body text-lg font-bold text-maroon">
            {t(locale, "aboutWho")}
          </h2>
          <div className="prose-book font-body text-base text-brown">
            {whoBody.map((p, i) => (
              <p key={i}>
                <RichText text={p} />
              </p>
            ))}
          </div>

          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 flex h-6 items-center justify-between rounded-card bg-maroon px-2 font-ui text-base font-extrabold tracking-[0.06em] text-offwhite uppercase transition-opacity hover:opacity-90"
          >
            {t(locale, "portfolio")}
            <Icon name="chevron-down" rotate={-90} />
          </a>
        </div>
      </div>
    </div>
  );
}
