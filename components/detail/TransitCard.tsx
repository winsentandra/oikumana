import { Icon, type IconName } from "@/components/ui/Icon";
import { formatDistance } from "@/lib/i18n";
import type { Locale, Transit } from "@/lib/types";

const ICON: Record<Transit["kind"], IconName> = {
  bus: "bus",
  mrt: "mrt",
  train: "train",
};

export function TransitCard({
  transits,
  locale,
  label,
  className = "",
}: {
  transits: Transit[];
  locale: Locale;
  label: string;
  className?: string;
}) {
  if (transits.length === 0) return null;

  return (
    <section className={`rounded-card bg-cream px-2 pt-2 ${className}`}>
      <h3 className="font-ui text-sm font-extrabold tracking-[0.06em] text-warm uppercase">
        {label}
      </h3>
      <ul>
        {transits.map((transit, i) => (
          <li
            key={`${transit.kind}-${transit.name}`}
            className={`flex min-h-8 items-center gap-1 py-1 ${
              i > 0 ? "border-t border-stroke" : ""
            }`}
          >
            <Icon name={ICON[transit.kind]} className="text-warm" />
            <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
              <p className="font-body text-base font-bold text-brown">
                {transit.name}
              </p>
              {transit.line ? (
                <p className="font-ui text-sm text-brown">{transit.line}</p>
              ) : null}
            </div>
            <span className="shrink-0 font-ui text-sm text-brown tabular-nums">
              {formatDistance(transit.distanceM, locale)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
