"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const COLLAPSED_LINES = 10;
const LINE_HEIGHT = 24;

/**
 * Book-set prose that collapses to ten lines behind a gradient mask — the
 * mockups fade the last line out rather than cutting it off, so this uses a
 * mask-image instead of overflow clipping.
 */
export function ExpandableProse({
  text,
  moreLabel,
  lessLabel,
}: {
  text: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-2">
      <div
        id={id}
        className="prose-book font-body text-base text-brown"
        style={
          open
            ? undefined
            : {
                maxHeight: COLLAPSED_LINES * LINE_HEIGHT,
                overflow: "hidden",
                maskImage:
                  "linear-gradient(to bottom, #000 calc(100% - 32px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, #000 calc(100% - 32px), transparent 100%)",
              }
        }
      >
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex items-center gap-[4px] self-start font-ui text-sm font-extrabold tracking-[0.06em] text-maroon uppercase"
      >
        {open ? lessLabel : moreLabel}
        <Icon
          name="chevron-down"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
