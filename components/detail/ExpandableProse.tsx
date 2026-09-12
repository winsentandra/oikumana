"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const COLLAPSED_LINES = 10;

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
  // Content that never actually exceeds the collapsed height doesn't need
  // the toggle at all — scrollHeight reflects the full intrinsic height
  // regardless of the collapsed style's overflow:hidden, so it's measured
  // as-is rather than needing a separate unclipped pass.
  const [overflowing, setOverflowing] = useState(false);
  /** Ten lines, at whatever the line height actually computes to. The type
   * scale is in `rem`, so this is not a constant 240px — at a larger text
   * size the clamp has to grow with it or it cuts mid-line. */
  const [collapsedHeight, setCollapsedHeight] = useState(COLLAPSED_LINES * 24);
  const contentRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const paragraphs = text.split(/\n{2,}/);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const height = COLLAPSED_LINES * (Number.isFinite(lineHeight) ? lineHeight : 24);
      setCollapsedHeight(height);
      setOverflowing(el.scrollHeight > height + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const collapsed = overflowing && !open;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={contentRef}
        id={id}
        className="prose-book font-body text-base text-brown"
        style={
          collapsed
            ? {
                maxHeight: collapsedHeight,
                overflow: "hidden",
                maskImage:
                  "linear-gradient(to bottom, #000 calc(100% - 32px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, #000 calc(100% - 32px), transparent 100%)",
              }
            : undefined
        }
      >
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {overflowing ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex items-center gap-[4px] self-start font-ui text-sm font-extrabold tracking-label text-maroon uppercase"
        >
          {open ? lessLabel : moreLabel}
          <Icon
            name="chevron-down"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      ) : null}
    </div>
  );
}
