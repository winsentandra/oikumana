"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";

/** Fraction of the viewport the sheet's top edge rests at when peeked. */
const PEEK_TOP_FRACTION = 0.67;

/** How close to the top edge the sheet gets when maximized. */
const MAXIMIZED_TOP_PX = 16;

/** Drag distance, in px, that counts as a deliberate lift or dismiss. */
const DRAG_THRESHOLD_PX = 8;

/**
 * Drag distance, in px, for the *collapse-while-maximized* gesture
 * specifically. Deliberately higher than DRAG_THRESHOLD_PX: this one has to
 * tell a real swipe-down apart from a scroll's momentum bouncing back once
 * it hits the top (iOS rubber-banding can overshoot past scrollTop 0 and
 * settle back), so it requires more sustained, active downward travel than
 * a content lift does.
 */
const COLLAPSE_THRESHOLD_PX = 20;

/** Wheel delta, on a single tick, that counts as a deliberate scroll. Low on
 * purpose — the goal is the *very first* real tick lifting immediately, with
 * nothing swallowed afterward, so a continuous flick lifts once and then
 * scrolls the content with no extra scroll required in between. */
const WHEEL_LIFT_PX = 4;

export interface BottomSheetHandle {
  /** maximized -> peek -> dismissed, one step per call. Used by a backdrop
   * tap and (on Android) the hardware back button. Returns true if the
   * sheet is still open after the step (so the caller — the back-button
   * handler — knows whether to keep trapping the next press), false once
   * this call is what closed it. */
  collapseOneLevel: () => boolean;
}

/**
 * Draggable bottom sheet, modelled on two states only — peek and maximized
 * — reachable equally by the grabber (drag directly) or by scrolling the
 * content (first scroll lifts to maximized; further scrolling scrolls the
 * content; a deliberate swipe back down once that content is at its own top
 * collapses to peek again). A downward swipe at peek dismisses outright.
 *
 * `resetKey` identifies *what* is being shown (a church slug) — switching
 * to a different one always collapses to peek and scrolls back to the top
 * first, rather than swapping content in place while maximized.
 */
export function BottomSheet({
  open,
  resetKey,
  ref,
  ...props
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  resetKey?: string;
  ref?: Ref<BottomSheetHandle>;
}) {
  // Mounting the body only while open means the snap position starts fresh
  // on every open, with no state to reset.
  if (!open) return null;
  return <SheetBody resetKey={resetKey} ref={ref} {...props} />;
}

function SheetBody({
  onClose,
  children,
  label,
  resetKey,
  ref,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
  resetKey?: string;
  ref?: Ref<BottomSheetHandle>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  const startY = useRef(0);
  const startTop = useRef(0);
  const contentEl = useRef<HTMLDivElement>(null);
  /** Mirrors `expanded` but updates synchronously inside the wheel handler
   * itself — a fast trackpad flick can fire several wheel events within one
   * synchronous burst, faster than React re-renders, so a check against the
   * `expanded` *state* would still see the pre-lift value and wrongly
   * preventDefault the immediately-following ticks too. */
  const liftedRef = useRef(false);

  /**
   * One touch/pointer gesture: armed on down, spent once it performs an
   * action. `manualScrollY` is set the instant a lift fires mid-gesture —
   * touch-action isn't guaranteed to switch to pan-y until the *next*
   * gesture on every platform, so rather than hope native scrolling picks
   * up immediately, the rest of this same drag drives scrollTop by hand.
   */
  const dragGesture = useRef({
    active: false,
    startY: 0,
    startedAtTop: true,
    spent: false,
    manualScrollY: null as number | null,
  });

  const collapse = () => {
    // Reset the scroll position too, so the next lift starts from the top.
    if (contentEl.current) contentEl.current.scrollTop = 0;
    liftedRef.current = false;
    setExpanded(false);
  };

  useImperativeHandle(
    ref,
    () => ({
      collapseOneLevel: () => {
        if (expanded) {
          collapse();
          return true;
        }
        onClose();
        return false;
      },
    }),
    [expanded, onClose]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Switching to a different church (same sheet instance, new content)
  // always lands back at peek with the scroll reset — never swaps content
  // in place while maximized. Comparing against the *previous* key (rather
  // than a boolean "have I run yet" flag) is what keeps this correct under
  // React's dev-mode Strict Mode double-invoking effects: a plain flag gets
  // flipped by the first invocation and wrongly treats the second one as
  // "not the first render" too, firing a spurious collapse right on mount.
  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      collapse();
    }
  }, [resetKey]);

  // React attaches its own wheel listener passively, which would make
  // preventDefault a silent no-op — this has to be a native, non-passive
  // listener for the lift's preventDefault to hold.
  //
  // Attached once, for the sheet's whole lifetime — not re-subscribed on
  // `expanded`, since waiting for a React re-render between ticks is
  // exactly what let a fast flick's later ticks slip through unhandled.
  // liftedRef is the source of truth instead: at peek, the very first tick
  // past the threshold lifts and flips it synchronously, so every following
  // tick (the rest of the same flick included) sees it immediately and is
  // left alone. `overflow-y` on the content is permanently `auto` (not
  // gated by React state) for the same reason — CSS driven by a state flip
  // would lag a render behind this handler, so the browser would still
  // think the element unscrollable for however many ticks land in that
  // window. Blocking pre-lift is done entirely here, synchronously, via
  // preventDefault on every tick regardless of size.
  useEffect(() => {
    const el = contentEl.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (liftedRef.current) return;
      e.preventDefault();
      if (e.deltaY > WHEEL_LIFT_PX) {
        liftedRef.current = true;
        setExpanded(true);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const topValue =
    drag !== null
      ? `${drag}%`
      : expanded
        ? `${MAXIMIZED_TOP_PX}px`
        : `${PEEK_TOP_FRACTION * 100}%`;

  // The grabber reaches the same two resting states as scroll-driven
  // expand/collapse — dragging it is just a direct, scroll-independent way
  // to get there, which is what keeps short (non-scrolling) content
  // collapsible too.
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    liftedRef.current = false;
    setExpanded(false);
    startY.current = e.clientY;
    startTop.current = expanded
      ? MAXIMIZED_TOP_PX
      : PEEK_TOP_FRACTION * window.innerHeight;
    setDrag((startTop.current / window.innerHeight) * 100);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    const next = startTop.current + (e.clientY - startY.current);
    const minPct = (MAXIMIZED_TOP_PX / window.innerHeight) * 100;
    setDrag(Math.min(Math.max((next / window.innerHeight) * 100, minPct), 100));
  };

  const onPointerUp = () => {
    if (drag === null) return;
    const peekPct = PEEK_TOP_FRACTION * 100;
    if (drag > peekPct + 12) {
      setDrag(null);
      onClose();
      return;
    }
    const maxPct = (MAXIMIZED_TOP_PX / window.innerHeight) * 100;
    setExpanded(drag < (peekPct + maxPct) / 2);
    setDrag(null);
  };

  // Not expanded yet: the first upward drag lifts the sheet to maximized
  // and is fully consumed by that (content stays non-scrollable until
  // then, so there's nothing to fight over — the next, separate gesture
  // scrolls it normally). A downward drag in this state dismisses instead,
  // from anywhere on the card, not just the grabber.
  //
  // Already expanded: content scrolls natively. A downward drag only
  // collapses back to peek once the content is scrolled to its own top —
  // and needs COLLAPSE_THRESHOLD_PX of real, active travel to do it, not
  // just a scrollTop reading of 0, so a momentum bounce-back at the top
  // can't be mistaken for a deliberate swipe.
  const onContentPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragGesture.current = {
      active: true,
      startY: e.clientY,
      startedAtTop: e.currentTarget.scrollTop === 0,
      spent: false,
      manualScrollY: null,
    };
  };

  const onContentPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = dragGesture.current;
    // Mouse hover fires pointermove continuously with no button held — only
    // act while a real down-drag is in progress, never on a passing hover.
    if (!gesture.active) return;

    // Already lifted within this same drag: hand-drive the scroll rather
    // than trust native touch scrolling to pick up mid-gesture.
    if (gesture.manualScrollY !== null) {
      e.preventDefault();
      const el = e.currentTarget;
      el.scrollTop += gesture.manualScrollY - e.clientY;
      gesture.manualScrollY = e.clientY;
      return;
    }

    if (gesture.spent) return;
    const deltaY = e.clientY - gesture.startY;

    if (!expanded) {
      if (-deltaY > DRAG_THRESHOLD_PX) {
        e.preventDefault();
        gesture.spent = true;
        gesture.manualScrollY = e.clientY;
        setExpanded(true);
      } else if (deltaY > DRAG_THRESHOLD_PX && e.currentTarget.scrollTop === 0) {
        e.preventDefault();
        gesture.spent = true;
        onClose();
      }
      return;
    }

    if (
      gesture.startedAtTop &&
      e.currentTarget.scrollTop === 0 &&
      deltaY > COLLAPSE_THRESHOLD_PX
    ) {
      e.preventDefault();
      gesture.spent = true;
      collapse();
    }
  };

  const onContentPointerUp = () => {
    dragGesture.current.active = false;
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-card bg-offwhite shadow-panel"
      style={{
        top: topValue,
        transition: drag === null ? "top 260ms cubic-bezier(0.32, 0.72, 0, 1)" : "none",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain ${
          expanded ? "touch-pan-y" : "touch-none"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
