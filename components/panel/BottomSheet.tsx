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

/** Finger movement, in px, before a touch on the card counts as a drag at
 * all. Below it, it's a tap — on a link, a tab, "Read more" — and nothing
 * should twitch. */
const TAP_SLOP_PX = 4;

/** How far the card itself has to have moved for a release to count as
 * moving the card. A swipe that scrolls the text back to its top and only
 * grazes the card on the way is a scroll, not a request to minimise. */
const MIN_CARD_TRAVEL_PX = 12;

/** Net travel below which a slow release is a nudge that changes nothing —
 * the user started a drag and thought better of it. */
const COMMIT_PX = 24;

/** Release speed, px/s, past which the swipe's direction decides the outcome
 * on its own, however far the card actually got. */
const DIRECTION_VELOCITY = 500;

/** Release velocity is measured over the last stretch of the gesture only,
 * and reads as zero if the finger had already stopped before lifting —
 * holding still and then letting go is not a flick. */
const VELOCITY_WINDOW_MS = 100;
const STALE_RELEASE_MS = 50;

/** Real phone swipes routinely read in the thousands of px/s, and coalesced
 * touch events can spike far past that. Handed to a spring unclamped, that
 * throws the card clean off the top of the screen before it settles. */
const MAX_SPRING_VELOCITY = 6000;

/** How quickly scroll momentum runs out. Slower than the sheet's own spring,
 * because a page of text coasting to a stop should feel like scrolling, not
 * like a panel snapping. */
const SCROLL_GLIDE_RESPONSE = 0.7;

/** In detent order, top of the screen downwards. */
const DETENTS: SheetState[] = ["maximized", "peek", "hidden"];

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

const clampVelocity = (v: number) =>
  Math.max(-MAX_SPRING_VELOCITY, Math.min(MAX_SPRING_VELOCITY, v));

/**
 * Where a released card lands, given the detent the gesture started from.
 *
 * One detent per swipe, never more: swipe down from Full and you get Peek,
 * however hard you threw it. Both reference apps behave this way. The version
 * before this didn't — it projected the swipe's momentum forward, and an
 * ordinary phone-speed swipe projects far past Peek, so the card closed
 * outright when it should only have minimised.
 *
 * Momentum decides the *direction* only. Within that direction the card
 * settles on whichever reachable detent is nearest to where the finger let
 * go, so a card dragged most of the way to Peek and released slowly still
 * goes there, and one flicked back the other way returns home.
 */
function pickSnap(
  from: SheetState,
  releaseTop: number,
  velocity: number,
  viewportH: number
): SheetState {
  const travel = releaseTop - restingTop(from, viewportH);
  if (Math.abs(travel) < MIN_CARD_TRAVEL_PX) return from;

  const direction =
    Math.abs(velocity) > DIRECTION_VELOCITY
      ? Math.sign(velocity)
      : Math.abs(travel) > COMMIT_PX
        ? Math.sign(travel)
        : 0;
  if (direction === 0) return from;

  const fromIndex = DETENTS.indexOf(from);
  const reachable = DETENTS.filter((_, i) => Math.abs(i - fromIndex) <= 1);
  const ahead = reachable.filter((d) => {
    const top = restingTop(d, viewportH);
    return direction > 0 ? top >= releaseTop : top <= releaseTop;
  });

  // Carried past the last detent it's allowed to reach: stop there rather
  // than skipping on to the next one.
  if (ahead.length === 0) {
    return direction > 0 ? reachable[reachable.length - 1] : reachable[0];
  }

  return ahead.reduce((a, b) =>
    Math.abs(restingTop(b, viewportH) - releaseTop) <
    Math.abs(restingTop(a, viewportH) - releaseTop)
      ? b
      : a
  );
}

/**
 * Apple Maps–style bottom sheet: Hidden (off-screen) / Peek (bottom 33%) /
 * Maximized (16px from the top), tracking the finger 1:1 across the whole
 * range and settling on a spring that inherits the finger's velocity.
 *
 * The card and its text move as one continuous surface. Swiping down first
 * scrolls the text back to its top and then, without lifting, carries on
 * pulling the card down; swiping up raises the card to Full and then carries
 * on into the text. Each release moves the card at most one detent, and a
 * moving card can be grabbed again mid-flight.
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
  /** Momentum for the text after a swipe that ended as a scroll. */
  const scrollGlide = useRef<SpringHandle | null>(null);
  /** What the running (or last finished) animation was aimed at, so the
   * state effect below doesn't re-animate a move the gesture already began. */
  const animTarget = useRef<number | null>(null);
  /** Backstop for a dismiss whose spring never reports rest. Tracked so that
   * grabbing a closing card cancels it — otherwise the card would close
   * anyway half a second after being pulled back up. */
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** One active pointer gesture, on whichever surface started it. */
  const gesture = useRef({
    active: false,
    pointerId: 0,
    /** The detent the card was resting at (or heading for) when the gesture
     * began — what "one detent down" is measured from. */
    startState: "peek" as SheetState,
    lastY: 0,
    /** The card's position before rubber-banding, so an overshoot past Full
     * unwinds by exactly the distance the finger pushed into it. */
    rawTop: 0,
    /** Movement accumulated while still inside the tap slop. */
    slop: 0,
    /** Past the tap slop: this is a drag, not a tap. */
    engaged: false,
    /** Whether this gesture scrolled the text at any point. */
    scrolled: false,
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
      velocity: clampVelocity(velocity),
      damping: SHEET_DAMPING,
      response: SHEET_RESPONSE,
      // Overshoot past Full goes through the same rubber band a drag does, so
      // a hard flick open compresses against the top edge instead of flying
      // off it.
      onUpdate: (v) => applyTop(rubberBand(v)),
      onRest: () => {
        animation.current = null;
        onRest?.();
      },
    });
  };

  const clearDismissTimer = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
  };

  /** Spring to a detent. Hidden is animated to and only then unmounted —
   * removing the sheet mid-slide would just make it vanish. */
  const settle = (next: SheetState, velocity: number, from?: SheetState) => {
    const vh = window.innerHeight;
    if (next === "hidden") {
      clearDismissTimer();
      dismissTimer.current = setTimeout(onClose, DISMISS_TIMEOUT_MS);
      animateTo(vh, velocity, () => {
        clearDismissTimer();
        onClose();
      });
      return;
    }
    // The detent catching the card is the causal moment worth a pulse — but
    // only when it actually changed. A nudge springing home isn't news.
    animateTo(restingTop(next, vh), velocity, from !== undefined && next !== from ? haptic : undefined);
  };

  const dismiss = () => {
    if (state === "hidden") return;
    setState("hidden");
    settle("hidden", 0);
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
      scrollGlide.current?.stop();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  // Programmatic moves only — a move a gesture started has already been
  // handed to a spring on release, and `animTarget` is how this tells the two
  // apart.
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
    const now = performance.now();
    samples.push({ t: now, y });
    while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW_MS) samples.shift();
  };

  /** Finger velocity at release, px/s, positive downwards. */
  const releaseVelocity = () => {
    const samples = gesture.current.samples;
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    if (performance.now() - last.t > STALE_RELEASE_MS) return 0;
    const first = samples[0];
    const dt = last.t - first.t;
    if (dt <= 0) return 0;
    return ((last.y - first.y) / dt) * 1000;
  };

  const finishDrag = (velocity: number) => {
    const from = gesture.current.startState;
    const next = pickSnap(from, presentedTop.current, velocity, window.innerHeight);
    setState(next);
    settle(next, velocity, from);
  };

  /** Stop whatever the card is doing and report where it is *right now*, so
   * grabbing a moving card continues from under the finger rather than
   * teleporting to where it was headed. */
  const grabTop = () => {
    animation.current?.stop();
    animation.current = null;
    animTarget.current = null;
    clearDismissTimer();
    return presentedTop.current;
  };

  /** Coast the text to a stop after a swipe that ended as a scroll, landing
   * where the flick was actually heading. Critically damped: a page of text
   * that overshoots and comes back is not scrolling, it's a spring. */
  const glideScroll = (velocity: number) => {
    const el = contentEl.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const from = el.scrollTop;
    // The finger moves the opposite way to the content it is pushing.
    const scrollVelocity = -clampVelocity(velocity);
    const target = Math.max(0, Math.min(from + projectMomentum(scrollVelocity), max));
    if (Math.abs(target - from) < 1) return;
    scrollGlide.current = spring({
      from,
      to: target,
      velocity: scrollVelocity,
      damping: 1,
      response: SCROLL_GLIDE_RESPONSE,
      onUpdate: (v) => {
        el.scrollTop = v;
      },
      onRest: () => {
        scrollGlide.current = null;
      },
    });
  };

  const startGesture = (e: React.PointerEvent, engaged: boolean) => {
    scrollGlide.current?.stop();
    scrollGlide.current = null;
    gesture.current = {
      active: true,
      pointerId: e.pointerId,
      startState: state,
      lastY: e.clientY,
      rawTop: grabTop(),
      slop: 0,
      engaged,
      scrolled: false,
      samples: [],
    };
    addSample(e.clientY);
  };

  /**
   * Spend one step of finger movement across the card and its text, as a
   * single continuous surface. Every pixel goes to exactly one place, in a
   * fixed order:
   *
   * - Finger down: unwind any rubber-band above Full, then scroll the text
   *   back towards its top, then lower the card.
   * - Finger up: raise the card to Full, then scroll further into the text,
   *   then rubber-band past Full once the text has nowhere left to go.
   *
   * That ordering is what lets one swipe both finish scrolling and start
   * moving the card, in either direction, without lifting.
   */
  const moveContent = (dy: number) => {
    const g = gesture.current;
    const el = contentEl.current;
    const vh = window.innerHeight;
    const maxScroll = el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0;
    let raw = g.rawTop;
    let scroll = el ? el.scrollTop : 0;

    if (dy > 0) {
      let down = dy;
      if (raw < MAXIMIZED_TOP_PX) {
        const take = Math.min(down, MAXIMIZED_TOP_PX - raw);
        raw += take;
        down -= take;
      }
      if (down > 0 && raw <= MAXIMIZED_TOP_PX && scroll > 0) {
        const take = Math.min(down, scroll);
        scroll -= take;
        down -= take;
      }
      raw += down;
    } else if (dy < 0) {
      let up = -dy;
      if (raw > MAXIMIZED_TOP_PX) {
        const take = Math.min(up, raw - MAXIMIZED_TOP_PX);
        raw -= take;
        up -= take;
      }
      if (up > 0 && scroll < maxScroll) {
        const take = Math.min(up, maxScroll - scroll);
        scroll += take;
        up -= take;
      }
      raw -= up;
    }

    g.rawTop = Math.min(raw, vh);
    if (el && el.scrollTop !== scroll) {
      el.scrollTop = scroll;
      g.scrolled = true;
    }
    applyTop(Math.min(rubberBand(g.rawTop), vh));
  };

  // The grabber drags only the card, never the text — so a card scrolled deep
  // into its text can still be collapsed with one short swipe from its edge.
  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (gesture.current.active) return;
    // Capture can fail if the browser never registered this as an active
    // pointer (e.g. a synthetic event) — the drag itself doesn't depend on
    // capture succeeding, so a failure here shouldn't abort it.
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    startGesture(e, true);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.pointerId) return;
    const dy = e.clientY - g.lastY;
    g.lastY = e.clientY;
    addSample(e.clientY);
    g.rawTop = Math.min(g.rawTop + dy, window.innerHeight);
    applyTop(Math.min(rubberBand(g.rawTop), window.innerHeight));
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.pointerId) return;
    g.active = false;
    finishDrag(releaseVelocity());
  };

  const onContentPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.active) return;
    startGesture(e, false);
  };

  const onContentPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.pointerId) return;
    const dy = e.clientY - g.lastY;
    g.lastY = e.clientY;
    addSample(e.clientY);

    if (!g.engaged) {
      g.slop += dy;
      if (Math.abs(g.slop) < TAP_SLOP_PX) return;
      g.engaged = true;
      // Captured only now that it's definitely a drag. Capturing on the
      // pointerdown would retarget the eventual click away from whatever was
      // tapped, and break every link and button inside the card.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      // Spend the movement held back by the slop, so the card doesn't lag
      // the finger by it for the rest of the gesture.
      moveContent(g.slop);
      return;
    }

    e.preventDefault();
    moveContent(dy);
  };

  const onContentPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.pointerId) return;
    g.active = false;

    // A tap. It may still have caught the card mid-flight, so send the card
    // on to where it was going rather than leaving it frozen there.
    if (!g.engaged) {
      settle(g.startState, 0);
      return;
    }

    const velocity = releaseVelocity();
    const cardAtFull = Math.abs(presentedTop.current - MAXIMIZED_TOP_PX) < 0.5;

    if (cardAtFull && g.scrolled) {
      // Ended as a scroll with the card resting at Full: nothing to snap.
      applyTop(MAXIMIZED_TOP_PX);
      animTarget.current = MAXIMIZED_TOP_PX;
      if (state !== "maximized") {
        setState("maximized");
        haptic();
      }
      // The momentum belongs to the text only if the swipe began at Full. One
      // that raised the card from Peek and ran on into the text stops where
      // the finger left it — otherwise flicking the card open would land you
      // partway down the article, and the next swipe down would be spent
      // scrolling back up before it could reach the card.
      if (g.startState === "maximized") glideScroll(velocity);
      return;
    }

    finishDrag(velocity);
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
        // `touch-none`, always — the load-bearing decision in this component.
        // A touch the browser has started scrolling natively can't be handed
        // to script partway through (iOS ignores preventDefault from then on),
        // and a touch script owns can't be handed back. So "scroll the text to
        // its top and keep pulling the card down, in one motion" is impossible
        // while the browser does the scrolling. The card owns every touch
        // instead, and scrolls the text itself — see `moveContent`.
        //
        // The previous version toggled this between `none` and `pan-y` as the
        // text reached its top, and each way that could go stale — a scroll
        // position of 0.33 on a 3x screen, WebKit applying the new value a
        // beat late — produced a swipe that did nothing, then another.
        //
        // Wheel, trackpad, keyboard and assistive scrolling are unaffected:
        // `touch-action` only governs touch.
        className={`no-scrollbar safe-b min-h-0 flex-1 touch-none overscroll-contain ${
          state === "maximized" ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
