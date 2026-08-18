"use client";

import type { ReactNode, Ref } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * The cream control shared by About and Language. Shows its label from the
 * desktop breakpoint up and collapses to a 48x48 icon square below it.
 */
export function IconPill({
  icon,
  label,
  srLabel,
  onClick,
  trailing,
  showLabel = true,
  expanded,
  ref,
}: {
  icon: IconName;
  label: string;
  srLabel?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  showLabel?: boolean;
  expanded?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={srLabel ?? label}
      aria-expanded={expanded}
      className="relative z-0 flex h-6 shrink-0 items-center rounded-card bg-offwhite px-[12px] text-brown shadow-float transition-colors hover:bg-cream"
    >
      <Icon name={icon} className="text-maroon" />
      {showLabel ? (
        <span className="hidden font-ui text-base whitespace-nowrap md:ml-1 md:block">
          {label}
        </span>
      ) : null}
      {/* No gap before the chevron — its own 24px canvas supplies the optical
          space, which is how the mockup lands at 134px total. */}
      {trailing}
    </button>
  );
}
