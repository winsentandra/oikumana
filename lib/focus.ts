"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside a surface that covers everything behind it. Only for
 * genuinely modal surfaces — a side panel sitting next to a live map is not
 * one, and trapping there would strand anyone trying to reach the map.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
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
  }, [ref, active]);
}

/**
 * Puts focus back where it came from once a surface closes, so dismissing a
 * panel doesn't dump the caret at the top of the document.
 */
export function useFocusReturn(active: boolean) {
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (active) {
      origin.current = document.activeElement as HTMLElement | null;
      return;
    }
    const el = origin.current;
    origin.current = null;
    // Restored unconditionally: while the surface was open focus was trapped
    // inside it, so by the time it closes there is nowhere sensible for the
    // caret to be except where it came from. Testing for `document.body`
    // first doesn't work — the surface is still mounted, playing its exit
    // animation, and still holding focus at this point.
    if (el && el.isConnected) el.focus();
  }, [active]);
}
