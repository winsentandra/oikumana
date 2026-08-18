"use client";

export function RegionChips({
  regions,
  active,
  onChange,
  allLabel,
}: {
  regions: string[];
  active: string | null;
  onChange: (region: string | null) => void;
  allLabel: string;
}) {
  const items: { key: string; label: string; value: string | null }[] = [
    { key: "__all", label: allLabel, value: null },
    ...regions.map((r) => ({ key: r, label: r, value: r })),
  ];

  return (
    <div
      role="group"
      className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto px-3 pt-2 pb-1"
    >
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={`h-[36px] shrink-0 rounded-card px-[12px] font-ui text-sm whitespace-nowrap transition-colors ${
              isActive
                ? "bg-maroon font-medium text-offwhite"
                : "border border-stroke bg-offwhite text-brown hover:bg-cream"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
