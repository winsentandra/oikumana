/** Tracked uppercase label left, value right, hairline beneath, 8px top/bottom padding. */
export function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-stroke py-1">
      <span className="font-ui text-sm font-extrabold tracking-[0.06em] text-warm uppercase">
        {label}
      </span>
      <span className="text-right font-body text-base text-brown">
        {value}
      </span>
    </div>
  );
}
