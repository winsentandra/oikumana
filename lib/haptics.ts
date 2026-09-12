/**
 * A single short pulse, fired on the frame the thing it describes actually
 * happens — a detent snapping home, a sheet committing to dismiss. Reserved
 * for those moments: feedback on everything trains people to ignore all of it.
 *
 * Vibration is unsupported on iOS Safari, so this is additive polish that
 * quietly does nothing rather than something to depend on.
 */
export function haptic(ms = 8) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Some browsers throw when the page isn't user-activated yet.
  }
}
