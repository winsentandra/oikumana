"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { projectMomentum, spring, type SpringHandle } from "@/lib/spring";
import { useMediaQuery } from "@/lib/useMediaQuery";

type SheetState = "hidden" | "peek" | "maximized";

/** How close to the top edge the sheet gets when maximized. */
const MAXIMIZED_TOP_PX = 16;

/** Peek covers the bottom 33% of the viewport, so its top sits at 67%.
 * Exported so other mobile layout math (e.g. centering a selected map pin
 * in the area above the sheet) can stay in sync with the sheet itself. */
export const PEEK_TOP_FRACTION = 0.67;

/** How much give a drag past the Maximized boundary gets before it stops
 * moving almost entirely — the classic iOS rubber-band diminishing-return
 * curve, not a hard clamp. Dragging past Hidden isn't given the same
 * treatment: it's already off-screen there, so there's nothing to feel. */
const RUBBER_BAND_SOFTNESS = 200;

/** Downward drag, in px, that resolves an ambiguous maximized/scrollTop=0
 * gesture as "drag the sheet" rather than "just scroll the content". */
const PENDING_RESOLVE_PX = 8;

/** Apple's own sheet numbers: a little overshoot, because every move this
 * sheet makes is the continuation of a drag the user's hand just gave it. */
const SHEET_DAMPING = 0.8;
const SHEET_RESPONSE = 0.3;

/** Long enough for the spring to have visibly left the screen. The dismiss
 * is reported to the parent on the spring's own rest callback instead
 * whenever it settles sooner. */
const DISMISS_TIMEOUT_MS = 500;

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

/**
 * The detent a flick is actually heading for. Rather than testing the release
 * velocity against a threshold, this projects where the motion would come to
 * rest on its own — the same exponential-decay model scrolling uses — and
 * snaps to whichever detent is nearest *that*. A hard throw from Maximized
 * therefore reaches Hidden in one motion, and a slow release still lands on
 * the nearest detent, without the two cases needing separate rules.
 */
function pickSnap(rawTop: number, velocity: number, viewportH: number): SheetState {
  const points: { key: SheetState; top: number }[] = [
    { key: "maximized", top: MAXIMIZED_TOP_PX },
    { key: "peek", top: PEEK_TOP_FRACTION * viewportH },
    { key: "hidden", top: viewportH },
  ];
  const projected = rawTop + projectMomentum(velocity);
  return points.reduce((a, b) =>
    Math.abs(b.top - projected) < Math.abs(a.top - projected) ? b : a
  ).key;
}

/**
 * Apple Maps–style bottom sheet: Hidden (off-screen) / Peek (bottom 33%) /
 * Maximized (16px from the top). The sheet tracks the finger 1:1 across the
 * whole range — the grabber always drags it; dragging the content does too,
 * except when Maximized with the content already scrolled down, in which
 * case that same gesture just scrolls the content instead. Release hands the
 * finger's own velocity to a spring, which carries the motion on to whichever
 * detent the throw was heading for, and can be grabbed again mid-flight.
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
  const sheetEl = useRef<HTMLDivElement>(null);
  const contentEl = useRef<HTMLDivElement>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  /** The value actually on screen this frame — not the resting value of
   * `state`. Every new animation and every new grab starts from here, which
   * is what makes the sheet catchable mid-flight instead of jumping to
   * wherever it was already heading. */
  const presentedTop = useRef(0);
  const animation = useRef<SpringHandle | null>(null);
  /** What the running (or last finished) animation was aimed at, so the
   * state effect below doesn't re-animate a move the gesture already began. */
  const animTarget = useRef<number | null>(null);

  /** One active pointer gesture, whichever surface started it.
   * `scrolling` is a "sheet" drag that reached fully-open mid-gesture and
   * handed off to manually driving the content's own scrollTop for the
   * rest of that same touch — see the handoff in onContentPointerMove. */
  const gesture = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    startTop: 0,
    mode: "sheet" as "sheet" | "content" | "pending" | "scrolling",
    contentStartScrollTop: 0,
    samples: [] as { t: number; y: number }[],
  });

  // Position is written straight to the element rather than round-tripping
  // through React: a pointermove is not a state change, and `transform` is
  // the only positional property the compositor can move on its own.
  const applyTop = (top: number) => {
    presentedTop.current = top;
    const el = sheetEl.current;
    if (el) el.style.transform = `translate3d(0, ${top - MAXIMIZED_TOP_PX}px, 0)`;
  };

  const animateTo = (target: number, velocity: number, onRest?: () => void) => {
    animation.current?.stop();
    animTarget.current = target;

    // Reduced motion keeps the change of position — that *is* the content
    // moving — but drops the travel and the overshoot, letting the opacity
    // cross-fade on the element carry the transition instead.
    if (reduceMotion) {
      animation.current = null;
      applyTop(target);
      onRest?.();
      return;
    }

    animation.current = spring({
      from: presentedTop.current,
      to: target,
      velocity,
      damping: SHEET_DAMPING,
      response: SHEET_RESPONSE,
      onUpdate: applyTop,
      onRest: () => {
        animation.current = null;
        onRest?.();
      },
    });
  };

  // Opens by sliding up from off-screen, matching Apple Maps' own opening
  // animation, rather than just appearing already at rest.
  useLayoutEffect(() => {
    // Runs after the DOM is in place but before the browser paints, so the
    // first frame anyone sees is already off-screen — which is the frame the
    // opening spring animates away from.
    applyTop(window.innerHeight);
    const id = requestAnimationFrame(() => setState("peek"));
    return () => {
      cancelAnimationFrame(id);
      animation.current?.stop();
    };
  }, []);

  // Programmatic moves only — a move a gesture started has already been
  // handed to a spring by `finishDrag`, and `animTarget` is how this tells
  // the two apart.
  useEffect(() => {
    if (gesture.current.active) return;
    const target = restingTop(state, window.innerHeight);
    if (animTarget.current === target) return;
    animateTo(target, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Detents are fractions of the viewport, so they move when it does —
  // a rotation, or the mobile URL bar collapsing.
  useEffect(() => {
    const onResize = () => {
      if (gesture.current.active || animation.current) return;
      applyTop(restingTop(state, window.innerHeight));
      animTarget.current = null;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [state]);

  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      if (contentEl.current) contentEl.current.scrollTop = 0;
      setState("peek");
    }
  }, [resetKey]);

  // Hidden is animated to, then unmounted — the spring plays the slide-down
  // first, and only once it has settled does the parent actually close
  // (removing the sheet mid-slide would just make it vanish). The timeout is
  // a backstop for a spring that gets interrupted or never rests.
  const closeOnRest = () => {
    const timeout = setTimeout(onClose, DISMISS_TIMEOUT_MS);
    animateTo(window.innerHeight, 0, () => {
      clearTimeout(timeout);
      onClose();
    });
  };

  const dismiss = () => {
    if (state === "hidden") return;
    setState("hidden");
    animTarget.current = window.innerHeight;
    closeOnRest();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const addSample = (y: number) => {
    const samples = gesture.current.samples;
    samples.push({ t: performance.now(), y });
    if (samples.length > 5) samples.shift();
  };

  /** Release velocity in px/s, which is what both the projection and the
   * spring's initial velocity are expressed in. */
  const releaseVelocity = () => {
    const samples = gesture.current.samples;
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    if (dt <= 0) return 0;
    return ((last.y - first.y) / dt) * 1000;
  };

  const finishDrag = () => {
    const vh = window.innerHeight;
    const velocity = releaseVelocity();
    const next = pickSnap(presentedTop.current, velocity, vh);
    setState(next);

    if (next === "hidden") {
      animTarget.current = vh;
      const timeout = setTimeout(onClose, DISMISS_TIMEOUT_MS);
      animateTo(vh, velocity, () => {
        clearTimeout(timeout);
        onClose();
      });
    } else {
      // The detent catching the sheet is the causal moment worth a pulse —
      // the one point in the gesture where something snaps home.
      animateTo(restingTop(next, vh), velocity, haptic);
    }
  };

  /** Wherever the sheet is *right now*, animation included — so grabbing a
   * moving sheet continues from under the finger rather than teleporting to
   * where it was headed. */
  const grabTop = () => {
    const stopped = animation.current?.stop();
    animation.current = null;
    animTarget.current = null;
    return stopped ? stopped.value : presentedTop.current;
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
      startTop: grabTop(),
      mode: "sheet",
      contentStartScrollTop: 0,
      samples: [],
    };
    addSample(e.clientY);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!gesture.current.active) return;
    addSample(e.clientY);
    const next = gesture.current.startTop + (e.clientY - gesture.current.startY);
    applyTop(Math.min(rubberBand(next), window.innerHeight));
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
      startTop: mode === "sheet" ? grabTop() : presentedTop.current,
      mode,
      contentStartScrollTop: 0,
      samples: [],
    };
    addSample(e.clientY);
  };

  const onContentPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active) return;

    if (g.mode === "content") return; // native scroll, untouched

    if (g.mode === "scrolling") {
      // Manually driven: this touch already had preventDefault() called on
      // it earlier in the gesture (while it was still dragging the sheet),
      // which tells the browser to leave its own native scrolling out of
      // the rest of this same touch sequence.
      e.preventDefault();
      const el = contentEl.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const raw = g.contentStartScrollTop + (g.startY - e.clientY);
      el.scrollTop = Math.max(0, Math.min(raw, max));
      return;
    }

    const deltaY = e.clientY - g.startY;

    if (g.mode === "pending") {
      if (deltaY > PENDING_RESOLVE_PX) {
        // Deliberate downward move: commit to dragging the sheet, starting
        // fresh from here so it doesn't jump by the distance already moved
        // while undecided.
        g.mode = "sheet";
        g.startY = e.clientY;
        g.startTop = grabTop();
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

    // Dragging past fully open, in one continuous motion, hands off to
    // scrolling the content instead of just rubber-banding in place —
    // otherwise opening the sheet and starting to read take two separate
    // gestures, which reads as "scrolling doesn't work" on the first try.
    if (next <= MAXIMIZED_TOP_PX) {
      const overshoot = MAXIMIZED_TOP_PX - next;
      setState("maximized");
      animTarget.current = MAXIMIZED_TOP_PX;
      applyTop(MAXIMIZED_TOP_PX);
      const el = contentEl.current;
      const max = el ? el.scrollHeight - el.clientHeight : 0;
      const startScrollTop = Math.max(0, Math.min(overshoot, max));
      if (el) el.scrollTop = startScrollTop;
      g.mode = "scrolling";
      g.startY = e.clientY;
      g.contentStartScrollTop = startScrollTop;
      return;
    }

    applyTop(Math.min(rubberBand(next), window.innerHeight));
  };

  const onContentPointerUp = () => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    if (g.mode === "sheet") finishDrag();
  };

  return (
    <div
      ref={sheetEl}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      // No inline transform: position is owned by `applyTop`, and a style
      // prop here would be re-applied on every render, snapping a sheet
      // mid-drag back to wherever the last render thought it was.
      className={`fixed inset-x-0 top-[16px] z-30 flex h-[calc(100dvh-16px)] flex-col rounded-t-card bg-offwhite shadow-panel transition-opacity duration-200 ${
        state === "hidden" ? "opacity-0" : "opacity-100"
      }`}
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
        className={`no-scrollbar safe-b min-h-0 flex-1 overscroll-contain ${
          state === "maximized" ? "touch-pan-y overflow-y-auto" : "touch-none overflow-hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
