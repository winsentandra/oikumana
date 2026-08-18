import { LogoMark } from "@/components/ui/Icon";

/**
 * The maroon lockup: 170x48 on desktop, with the ALPHA badge hanging flush
 * beneath its right edge. On mobile the pill stretches to fill the row.
 */
export function BrandPill({ className = "" }: { className?: string }) {
  return (
    <div className={`relative z-0 ${className}`}>
      {/* Bottom-right corner stays square — the ALPHA badge attaches flush
          against it there, so a rounded corner would leave a visible gap. */}
      <div className="flex h-6 items-center justify-center gap-[4px] rounded-tl-card rounded-tr-card rounded-bl-card bg-maroon px-[12px] text-peach">
        <LogoMark className="size-[28px]" />
        <span className="font-display text-xl leading-none font-bold select-none">
          OIKUMANA
        </span>
      </div>
      <span className="absolute top-full right-0 flex h-[20px] items-center rounded-b-[4px] bg-peach px-1 font-ui text-xs font-extrabold tracking-[0.08em] text-brown uppercase">
        Alpha
      </span>
    </div>
  );
}
