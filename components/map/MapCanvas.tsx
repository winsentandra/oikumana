"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import L from "leaflet";
import type { Church } from "@/lib/types";
import { publicAsset } from "@/lib/public-asset";

/** Jakarta, framed the way the mockups open. */
const CENTER: [number, number] = [-6.175, 106.83];
const ZOOM = 14;

const pinHtml = (selected: boolean) =>
  `<img src="${publicAsset("/icons/map-pin.svg")}" width="48" height="48" alt="" draggable="false" class="${
    selected ? "is-selected" : ""
  }" />`;

export interface MapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  /** Briefly ignores drag/zoom input — used right after a swipe-dismiss so
   * the gesture's remaining momentum doesn't also pan or zoom the map. */
  suspendInteraction: (ms: number) => void;
}

export function MapCanvas({
  churches,
  selected,
  onSelect,
  /** Horizontal room taken by the desktop panel, so fly-to stays clear of it. */
  panelOffset,
  /** A genuine tap on the open map/backdrop — never fires for a pan or a
   * pinch, since Leaflet itself only emits `click` for a tap that didn't
   * turn into a drag. Used to collapse the open sheet by one level. */
  onMapTap,
  ref,
}: {
  churches: Church[];
  selected: string | null;
  onSelect: (slug: string) => void;
  panelOffset: number;
  onMapTap?: () => void;
  ref?: Ref<MapCanvasHandle>;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const onMapTapRef = useRef(onMapTap);

  // Keep the click handlers current without re-creating the markers/map.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onMapTapRef.current = onMapTap;
  }, [onMapTap]);

  // Init once.
  useEffect(() => {
    if (!holder.current || map.current) return;

    const m = L.map(holder.current, {
      center: CENTER,
      zoom: ZOOM,
      zoomControl: false,
      attributionControl: true,
      // Leaflet's own scrollWheelZoom zooms on *any* wheel event, with no
      // way to tell a plain mouse-wheel notch apart from a trackpad pinch —
      // both arrive as the same WheelEvent. It's off here and replaced
      // below with a handler that only zooms on ctrlKey wheel (see there
      // for why that's the actual pinch signal).
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });

    m.on("click", () => onMapTapRef.current?.());

    // A trackpad pinch has no dedicated browser event — macOS/the browser
    // reports it as a WheelEvent with ctrlKey forced true (this is true even
    // though no Ctrl key is actually pressed; it's the standard signal sites
    // use to tell pinch apart from an ordinary two-finger scroll, same as
    // Google Maps). Leaflet's touchZoom only covers genuine multi-touch
    // events, which a trackpad never sends, so without this, pinch has no
    // handler at all on a laptop. Plain wheel (no ctrlKey) is left alone —
    // not zoomed, not panned — matching "pinch only".
    const ZOOM_SENSITIVITY = 0.01;
    let zoomRaf: number | null = null;
    let pendingDelta = 0;
    let pendingPoint: L.Point | null = null;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      pendingDelta += e.deltaY;
      pendingPoint = new L.Point(e.offsetX, e.offsetY);
      if (zoomRaf !== null) return;
      zoomRaf = requestAnimationFrame(() => {
        zoomRaf = null;
        if (!pendingPoint) return;
        const nextZoom = m.getZoom() - pendingDelta * ZOOM_SENSITIVITY;
        pendingDelta = 0;
        m.setZoomAround(
          pendingPoint,
          Math.min(Math.max(nextZoom, m.getMinZoom()), m.getMaxZoom()),
          { animate: false }
        );
      });
    };
    holder.current.addEventListener("wheel", onWheel, { passive: false });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(m);

    m.attributionControl.setPrefix(false);
    map.current = m;

    const created = markers.current;
    const holderEl = holder.current;
    return () => {
      if (zoomRaf !== null) cancelAnimationFrame(zoomRaf);
      holderEl.removeEventListener("wheel", onWheel);
      m.remove();
      map.current = null;
      created.clear();
    };
  }, []);

  // Sync markers with the data.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    for (const church of churches) {
      if (markers.current.has(church.slug)) continue;
      const marker = L.marker(church.coords, {
        icon: L.divIcon({
          className: "oikumana-pin",
          html: pinHtml(false),
          iconSize: [48, 48],
          iconAnchor: [24, 44],
        }),
        title: church.name.en,
        keyboard: true,
        alt: church.name.en,
      })
        .addTo(m)
        .on("click", () => onSelectRef.current(church.slug));
      markers.current.set(church.slug, marker);
    }
  }, [churches]);

  // Reflect selection in the pin, and bring it into the visible half.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    for (const [slug, marker] of markers.current) {
      const isSelected = slug === selected;
      marker.setIcon(
        L.divIcon({
          className: `oikumana-pin${isSelected ? " is-selected" : ""}`,
          html: pinHtml(isSelected),
          iconSize: [48, 48],
          iconAnchor: [24, 44],
        })
      );
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    }

    if (!selected) return;
    const church = churches.find((c) => c.slug === selected);
    if (!church) return;

    const point = m.project(church.coords, m.getZoom());
    // Shift the target right by half the panel so the pin lands in the
    // uncovered part of the viewport rather than behind the rail.
    const shifted = point.subtract([panelOffset / 2, 0]);
    m.flyTo(m.unproject(shifted, m.getZoom()), Math.max(m.getZoom(), 15), {
      duration: 0.6,
    });
  }, [selected, churches, panelOffset]);

  // Zoom and locate controls live outside this component (desktop bottom-right
  // stack, mobile inline-with-search button) so both can drive the same map
  // instance without duplicating Leaflet setup.
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => map.current?.zoomIn(),
      zoomOut: () => map.current?.zoomOut(),
      flyTo: (lat, lng, zoom = 16) => {
        map.current?.flyTo([lat, lng], zoom, { duration: 0.8 });
      },
      suspendInteraction: (ms) => {
        // Only touches what's normally enabled — scroll-wheel and
        // double-click zoom are off permanently (pinch-only), so there's
        // nothing to suspend or restore there.
        const m = map.current;
        if (!m) return;
        m.dragging.disable();
        m.touchZoom.disable();
        setTimeout(() => {
          m.dragging.enable();
          m.touchZoom.enable();
        }, ms);
      },
    }),
    []
  );

  return <div ref={holder} className="absolute inset-0 z-0" aria-hidden="true" />;
}

export default MapCanvas;
