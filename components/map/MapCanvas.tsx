"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import L from "leaflet";
import type { Church } from "@/lib/types";
import { publicAsset } from "@/lib/public-asset";

/** Jakarta, framed the way the mockups open. */
const CENTER: [number, number] = [-6.175, 106.83];
const ZOOM = 14;

const pinHtml = `<img src="${publicAsset(
  "/icons/map-pin.svg"
)}" width="48" height="48" alt="" draggable="false" />`;

export interface MapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  /** Briefly ignores *panning* — used right after a swipe-dismiss so the
   * gesture's remaining momentum doesn't also drag the map out from under
   * the closing sheet. Deliberately the narrowest possible lockout: zoom,
   * clicks and keyboard all stay live throughout. */
  suspendInteraction: (ms: number) => void;
}

export function MapCanvas({
  churches,
  selected,
  onSelect,
  /** Horizontal room taken by the desktop panel, so fly-to stays clear of it. */
  panelOffset,
  /** Vertical room taken by the header cluster at the top, so a selected
   * pin doesn't land underneath it (mobile only — desktop's header floats
   * clear of the map already). */
  topInset = 0,
  /** Fraction (0-1) of the viewport height covered by the mobile bottom
   * sheet at rest (Peek), so a selected pin centers in the space actually
   * left visible above it rather than the full screen. */
  bottomInsetFraction = 0,
  label,
  ref,
}: {
  churches: Church[];
  selected: string | null;
  onSelect: (slug: string) => void;
  panelOffset: number;
  topInset?: number;
  bottomInsetFraction?: number;
  /** Accessible name for the map region itself. */
  label: string;
  ref?: Ref<MapCanvasHandle>;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);

  // Keep the click handler current without re-creating the markers.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Init once.
  useEffect(() => {
    if (!holder.current || map.current) return;

    const m = L.map(holder.current, {
      center: CENTER,
      zoom: ZOOM,
      zoomControl: false,
      attributionControl: true,
      // Default Leaflet/Google-Maps-style interaction: plain scroll-wheel
      // zooms, double-click zooms, touch pinch zooms, single-finger drag
      // pans. No custom gesture filtering.
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(m);

    m.attributionControl.setPrefix(false);

    // Tiles are decorative wallpaper and read as an endless list of link and
    // image nodes; the markers layered over them are not, so only the tile
    // pane is hidden rather than the whole map.
    m.getPane("tilePane")?.setAttribute("aria-hidden", "true");

    map.current = m;

    const created = markers.current;
    return () => {
      m.remove();
      map.current = null;
      created.clear();
    };
  }, []);

  // Sync markers with the data. A church whose `group` lists a slug ahead of
  // its own shares that other church's pin — only the group's first member
  // gets a marker, and clicking it always selects that same first slug; the
  // detail panel's own tabs handle switching between the rest.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    for (const church of churches) {
      if (church.group && church.group[0] !== church.slug) continue;
      if (markers.current.has(church.slug)) continue;
      const marker = L.marker(church.coords, {
        icon: L.divIcon({
          className: "oikumana-pin",
          html: pinHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 44],
        }),
        title: church.name.en,
        keyboard: true,
        alt: church.name.en,
      })
        .addTo(m)
        .on("click", () => onSelectRef.current(church.slug));

      // The pins are the primary way around this map, so they have to be
      // reachable without one. Leaflet's own `keyboard: true` already makes
      // the element tabbable and turns Enter into a click; what it doesn't
      // give it is a role or a name a screen reader can announce.
      const el = marker.getElement();
      if (el) {
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", church.name.en);
      }

      markers.current.set(church.slug, marker);
    }
  }, [churches]);

  // Reflect selection in the pin, and bring it into the visible half.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    for (const [slug, marker] of markers.current) {
      const church = churches.find((c) => c.slug === slug);
      const group = church?.group ?? [slug];
      const isSelected = !!selected && group.includes(selected);

      // Toggling the class keeps the same element on screen, which is what
      // gives the scale transition a previous value to animate *from*.
      // `setIcon` would mount a replacement node already at its end state,
      // so the transition would never play at all.
      const el = marker.getElement();
      if (el) {
        el.classList.toggle("is-selected", isSelected);
        if (isSelected) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      }
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    }

    if (!selected) return;
    const church = churches.find((c) => c.slug === selected);
    if (!church) return;

    const point = m.project(church.coords, m.getZoom());
    // Shift the target right by half the panel so the pin lands in the
    // uncovered part of the viewport rather than behind the rail.
    // Vertically (mobile), center the pin in the area actually left visible
    // between the header and the peeking bottom sheet, rather than the full
    // screen height — same trick, on the other axis: subtracting how far
    // that area's midpoint sits from the viewport's own midpoint.
    const size = m.getSize();
    const visibleTop = topInset;
    const visibleBottom = size.y * (1 - bottomInsetFraction);
    const vOffset = (visibleTop + visibleBottom) / 2 - size.y / 2;
    const shifted = point.subtract([panelOffset / 2, vOffset]);
    m.flyTo(m.unproject(shifted, m.getZoom()), Math.max(m.getZoom(), 15), {
      duration: 0.6,
    });
  }, [selected, churches, panelOffset, topInset, bottomInsetFraction]);

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
        const m = map.current;
        if (!m) return;
        m.dragging.disable();
        setTimeout(() => m.dragging.enable(), ms);
      },
    }),
    []
  );

  return (
    <div
      ref={holder}
      role="application"
      aria-label={label}
      className="absolute inset-0 z-0"
    />
  );
}

export default MapCanvas;
