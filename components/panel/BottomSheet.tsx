"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type SheetState = "hidden" | "peek" | "maximized";

/** How close to the top edge the sheet gets when maximized. */
const MAXIMIZED_TOP_PX = 16;

/** Peek covers the bottom 33% of the viewport, so its top sits at 67%.
 * Exported so other mobile layout math (e.g. centering a selected map pin
 * in the area above the sheet) can stay in sync with the sheet itself. */
export const PEEK_TOP_FRACTION = 0.67;

/** Release speed, in px/ms, that commits to the next state in that
 * direction even if released before the midpoint — a fast flick. */
const VELOCITY_THRESHOLD = 0.5;

/** How much give a drag past the Maximized boundary gets before it stops
 * moving almost entirely — the classic iOS rubber-band diminishing-return
 * curve, not a hard clamp. Dragging past Hidden isn't given the same
 * treatment: it's already off-screen there, so there's nothing to feel. */
const RUBBER_BAND_SOFTNESS = 200;

/** Downward drag, in px, that resolves an ambiguous maximized/scrollTop=0
 * gesture as "drag the sheet" rather than "just scroll the content". */
const PENDING_RESOLVE_PX = 8;

/** Apple's own sheet-detent deceleration curve — non-linear, no overshoot. */
const SNAP_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const SNAP_DURATION_MS = 320;

function restingTop(state: SheetState, viewportH: number) {
  if (state === "hidden") return viewportH;
  if (state === "maximized") return MAXIMIZED_TOP_PX;
  return PEEK_TOP_FRACTION * viewportH;
}

function rubberBand(rawTop: number) {
  if (rawTop >= MAXIMIZED_TOP_PX) return rawTop;
  const overshoot = MAXIMIZED_TOP_PX - rawTop;
  const damped = (overshoot * RUBBER_BAND_SOFTNESS) / (overshoot + RUBBER_BAND_SOFTNESS);
  return MAXIMIZED_TOP_PX - damped;
}

/** Nearest snap state to `rawTop`, or the velocity-implied one for a flick
 * fast enough to commit before reaching the midpoint — true 1:1 tracking
 * means a hard, fast drag from Maximized can land on Hidden directly. */
function pickSnap(rawTop: number, velocity: number, viewportH: number): SheetState {
  const points: { key: SheetState; top: number }[] = [
    { key: "maximized", top: MAXIMIZED_TOP_PX },
    { key: "peek", top: PEEK_TOP_FRACTION * viewportH },
    { key: "hidden", top: viewportH },
  ];
  const nearest = (candidates: typeof points) =>
    candidates.reduce((a, b) => (Math.abs(b.top - rawTop) < Math.abs(a.top - rawTop) ? b : a)).key;

  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    const movingDown = velocity > 0;
    const inDirection = points.filter((p) => (movingDown ? p.top >= rawTop : p.top <= rawTop));
    if (inDirection.length > 0) return nearest(inDirection);
    return movingDown ? "hidden" : "maximized";
  }
  return nearest(points);
}

/**
 * Apple Maps–style bottom sheet: Hidden (off-screen) / Peek (bottom 33%) /
 * Maximized (16px from the top). The sheet tracks the finger 1:1 across the
 * whole range — the grabber always drags it; dragging the content does too,
 * except when Maximized with the content already scrolled down, in which
 * case that same gesture just scrolls the content instead. Release snaps to
 * the nearest state, or the velocity-implied one for a fast flick, so a
 * hard drag from Maximized can land on Hidden in one motion.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  label,
  resetKey,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  /** Identifies what's being shown (a church slug) — switching to a
   * different one drops back to Peek with the content scrolled to top. */
  resetKey?: string;
}) {
  // Mounting the body only while open means state starts fresh on every
  // open, with nothing to reset.
  if (!open) return null;
  return (
    <SheetBody onClose={onClose} label={label} resetKey={resetKey}>
      {children}
    </SheetBody>
  );
}

function SheetBody({
  onClose,
  children,
  label,
  resetKey,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
  resetKey?: string;
}) {
  const [state, setState] = useState<SheetState>("hidden");
  const [dragTop, setDragTop] = useState<number | null>(null);
  const contentEl = useRef<HTMLDivElement>(null);

  /** One active pointer gesture, whichever surface started it. */
  const gesture = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    startTop: 0,
    mode: "sheet" as "sheet" | "content" | "pending",
    samples: [] as { t: number; y: number }[],
  });

  // Opens by sliding up from off-screen, matching Apple Maps' own opening
  // animation, rather than just appearing already at rest. `hasOpened`
  // distinguishes this transient initial "hidden" from a real dismiss —
  // without it, the close-on-hidden effect below would fire immediately on
  // mount, before the opening animation ever played.
  const hasOpened = useRef(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      hasOpened.current = true;
      setState("peek");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      if (contentEl.current) contentEl.current.scrollTop = 0;
      setState("peek");
    }
  }, [resetKey]);

  // Hidden is animated to, then unmounted — the state transition plays the
  // slide-down first, and only once it's finished does the parent actually
  // close (removing the sheet mid-slide would just make it vanish).
  useEffect(() => {
    if (state !== "hidden" || !hasOpened.current) return;
    const id = setTimeout(onClose, SNAP_DURATION_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const topPx = dragTop ?? restingTop(state, typeof window !== "undefined" ? window.innerHeight : 0);

  const addSample = (y: number) => {
    const samples = gesture.current.samples;
    samples.push({ t: performance.now(), y });
    if (samples.length > 5) samples.shift();
  };

  const releaseVelocity = () => {
    const samples = gesture.current.samples;
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    if (dt <= 0) return 0;
    return (last.y - first.y) / dt;
  };

  const finishDrag = () => {
    const vh = window.innerHeight;
    const raw = dragTop ?? restingTop(state, vh);
    const velocity = releaseVelocity();
    setState(pickSnap(raw, velocity, vh));
    setDragTop(null);
  };

  // The grabber always drags the sheet, whatever the scroll position —
  // that's what keeps short, never-scrolling content collapsible too.
  const onHandlePointerDown = (e: React.PointerEvent) => {
    // Capture can fail if the browser never registered this as an active
    // pointer (e.g. a synthetic event) — the drag itself doesn't depend on
    // capture succeeding, so a failure here shouldn't abort it.
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    gesture.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      startTop: restingTop(state, window.innerHeight),
      mode: "sheet",
      samples: [],
    };
    addSample(e.clientY);
    setDragTop(gesture.current.startTop);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!gesture.current.active) return;
    addSample(e.clientY);
    const next = gesture.current.startTop + (e.clientY - gesture.current.startY);
    setDragTop(Math.min(rubberBand(next), window.innerHeight));
  };

  const onHandlePointerUp = () => {
    if (!gesture.current.active) return;
    gesture.current.active = false;
    finishDrag();
  };

  // On the content itself: at Peek, content is scroll-locked, so any drag
  // there belongs to the sheet (same as the grabber). At Maximized, a drag
  // that starts with the content already scrolled down is content-scroll,
  // full stop, for the whole gesture — decided once, right here, rather
  // than re-checked mid-drag. A drag that starts at scrollTop 0 is
  // ambiguous until it moves: scrolling further into the content (up) is
  // just a scroll, while a deliberate move down is what drags the sheet
  // back to Peek — `pending` is that undecided window.
  const onContentPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const atTop = e.currentTarget.scrollTop === 0;
    const mode: "sheet" | "content" | "pending" =
      state !== "maximized" ? "sheet" : atTop ? "pending" : "content";

    gesture.current = {
      active: true,
      pointerId: e.pointerId,
      startY: e.clientY,
      startTop: restingTop(state, window.innerHeight),
      mode,
      samples: [],
    };
    addSample(e.clientY);
    if (mode === "sheet") setDragTop(gesture.current.startTop);
  };

  const onContentPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active) return;

    if (g.mode === "content") return; // native scroll, untouched

    const deltaY = e.clientY - g.startY;

    if (g.mode === "pending") {
      if (deltaY > PENDING_RESOLVE_PX) {
        // Deliberate downward move: commit to dragging the sheet, starting
        // fresh from here so it doesn't jump by the distance already moved
        // while undecided.
        g.mode = "sheet";
        g.startY = e.clientY;
        g.startTop = restingTop(state, window.innerHeight);
        setDragTop(g.startTop);
      } else if (deltaY < -PENDING_RESOLVE_PX) {
        // Moving up from the top of the content is just a scroll.
        g.mode = "content";
      }
      return;
    }

    // g.mode === "sheet"
    e.preventDefault();
    addSample(e.clientY);
    const next = g.startTop + (e.clientY - g.startY);
    setDragTop(Math.min(rubberBand(next), window.innerHeight));
  };

  const onContentPointerUp = () => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    if (g.mode === "sheet") finishDrag();
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-card bg-offwhite shadow-panel"
      style={{
        top: `${topPx}px`,
        transition:
          dragTop === null ? `top ${SNAP_DURATION_MS}ms ${SNAP_EASING}` : "none",
      }}
    >
      <div
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        className="flex h-[20px] shrink-0 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing"
      >
        <span className="h-[4px] w-8 rounded-full bg-stroke" />
      </div>
      <div
        ref={contentEl}
        onPointerDown={onContentPointerDown}
        onPointerMove={onContentPointerMove}
        onPointerUp={onContentPointerUp}
        onPointerCancel={onContentPointerUp}
        className={`no-scrollbar min-h-0 flex-1 overscroll-contain ${
          state === "maximized" ? "touch-pan-y overflow-y-auto" : "touch-none overflow-hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
