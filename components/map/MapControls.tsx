"use client";

import { Icon } from "@/components/ui/Icon";

/**
 * Zoom and locate controls, bottom-right over the map.
 *
 * Sits 8px above the CARTO/OSM attribution line (which is 16px tall), so the
 * stack bottoms out at 24px. Shares the z-layer with the header chrome, which
 * means the scrim dims it along with the map.
 */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocate,
  locating,
  labels,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  locating: boolean;
  labels: { zoomIn: string; zoomOut: string; locate: string };
}) {
  return (
    <div className="pointer-events-none fixed right-2 bottom-3 z-10 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onLocate}
        aria-label={labels.locate}
        aria-busy={locating}
        className="pointer-events-auto grid size-4 place-items-center rounded-card border border-transparent bg-offwhite text-brown shadow-float transition-colors hover:bg-cream"
      >
        <Icon name="my-location" className={locating ? "opacity-50" : ""} />
      </button>

      {/* One card, two buttons, hairline between — matching the reference. */}
      <div className="pointer-events-auto overflow-hidden rounded-card bg-offwhite shadow-float">
        <button
          type="button"
          onClick={onZoomIn}
          aria-label={labels.zoomIn}
          className="grid size-4 place-items-center text-brown transition-colors hover:bg-cream"
        >
          <Icon name="zoom-in" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          aria-label={labels.zoomOut}
          className="grid size-4 place-items-center border-t border-stroke text-brown transition-colors hover:bg-cream"
        >
          <Icon name="zoom-out" />
        </button>
      </div>
    </div>
  );
}
