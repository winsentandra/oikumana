import type { CSSProperties } from "react";
import { publicAsset } from "@/lib/public-asset";

export type IconName =
  | "about"
  | "bus"
  | "chevron-down"
  | "close"
  | "close-small"
  | "direction"
  | "language"
  | "list"
  | "mrt"
  | "my-location"
  | "search"
  | "train"
  | "zoom-in"
  | "zoom-out";

/**
 * Renders one of the supplied 24x24 SVGs as a CSS mask, so the artwork takes
 * its colour from the parent's `color`. The source files are used as-is —
 * never edited, never duplicated per colour.
 */
export function Icon({
  name,
  className = "",
  style,
  rotate,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`icon ${className}`}
      style={{
        ["--icon" as string]: `url("${publicAsset(`/icons/${name}.svg`)}")`,
        ...(rotate ? { transform: `rotate(${rotate}deg)` } : null),
        ...style,
      }}
    />
  );
}

/** The 120x120 brand mark, masked the same way. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`icon icon-logo ${className}`}
      style={{
        ["--icon" as string]: `url("${publicAsset("/icons/logo.svg")}")`,
      }}
    />
  );
}
