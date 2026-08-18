"use client";

import { useEffect, useState } from "react";

/**
 * Desktop breakpoint. Below this the panel becomes a bottom sheet and the
 * search bar moves to the bottom of the screen.
 */
export const DESKTOP_QUERY = "(min-width: 768px)";

export function useMediaQuery(query: string) {
  // Start false so server and first client render agree; the effect corrects
  // it before paint via useLayoutEffect-equivalent timing on the client.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY);
}
