"use client";

import type { Ref } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * The 48px field.
 *
 * A 1px border is always present — transparent at rest when floating over the
 * map, `stroke` once it sits in the panel strip — so the box never changes
 * size. No hover or focus styling: background and border stay fixed for the
 * current state.
 */
export function SearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  clearLabel,
  onClear,
  inputRef,
  trailingAction,
  elevated = true,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder: string;
  clearLabel: string;
  onClear?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  /** Shown after the magnifier — closes the open detail panel. */
  trailingAction?: { label: string; onClick: () => void };
  /** Floating over the map (shadow) vs sitting in the panel strip (stroke). */
  elevated?: boolean;
  /** For a field that mounts fresh already "open", e.g. the mobile search takeover. */
  autoFocus?: boolean;
}) {
  const trailing =
    onClear && value
      ? { label: clearLabel, onClick: onClear }
      : !value && trailingAction
        ? trailingAction
        : null;

  return (
    <div
      className={`relative z-0 flex h-6 min-w-0 flex-1 items-center gap-1 rounded-card border bg-offwhite pl-2 pr-[0.6875rem] ${
        elevated ? "border-transparent shadow-float" : "border-stroke"
      }`}
    >
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent font-ui text-base text-brown placeholder:text-warm focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      <Icon name="search" className="text-brown" />
      {trailing ? (
        <span className="flex h-4 items-center border-l border-stroke pl-[0.6875rem]">
          <button
            type="button"
            onClick={trailing.onClick}
            aria-label={trailing.label}
            // The visible dot stays small; `before` widens what you can
            // actually hit to a full 44px without moving anything.
            className="relative grid size-3 place-items-center rounded-full bg-cream text-brown transition-colors before:absolute before:-inset-[0.625rem] before:content-[''] hover:bg-stroke"
          >
            <Icon name="close-small" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
