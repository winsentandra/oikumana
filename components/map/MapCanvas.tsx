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
  /** Vertical room taken by the header cluster at the top, so a selected
   * pin doesn't land underneath it (mobile only — desktop's header floats
   * clear of the map already). */
  topInset = 0,
  /** Fraction (0-1) of the viewport height covered by the mobile bottom
   * sheet at rest (Peek), so a selected pin centers in the space actually
   * left visible above it rather than the full screen. */
  bottomInsetFraction = 0,
  ref,
}: {
  churches: Church[];
  selected: string | null;
  onSelect: (slug: string) => void;
  panelOffset: number;
  topInset?: number;
  bottomInsetFraction?: number;
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
      const church = churches.find((c) => c.slug === slug);
      const group = church?.group ?? [slug];
      const isSelected = !!selected && group.includes(selected);
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
        m.scrollWheelZoom.disable();
        m.touchZoom.disable();
        m.doubleClickZoom.disable();
        setTimeout(() => {
          m.dragging.enable();
          m.scrollWheelZoom.enable();
          m.touchZoom.enable();
          m.doubleClickZoom.enable();
        }, ms);
      },
    }),
    []
  );

  return <div ref={holder} className="absolute inset-0 z-0" aria-hidden="true" />;
}

export default MapCanvas;
