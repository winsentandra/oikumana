"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HeaderCluster } from "./chrome/HeaderCluster";
import { SearchBar } from "./search/SearchBar";
import { SearchResults } from "./search/SearchResults";
import { RegionChips } from "./panel/RegionChips";
import { ChurchRow } from "./panel/ChurchRow";
import { BottomSheet, PEEK_TOP_FRACTION } from "./panel/BottomSheet";
import { ChurchDetail } from "./detail/ChurchDetail";
import { AboutModal } from "./about/AboutModal";
import { MapControls } from "./map/MapControls";
import { Icon } from "./ui/Icon";
import { churches, regions, getChurch } from "@/lib/churches";
import { searchChurches } from "@/lib/search";
import { t } from "@/lib/i18n";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { useFocusReturn, useFocusTrap } from "@/lib/focus";
import type { Locale } from "@/lib/types";
import type { MapCanvasHandle } from "./map/MapCanvas";

const MapCanvas = dynamic(() => import("./map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 z-0 bg-cream" />,
});

/** The desktop rail, 480px. The pixel width the map needs for its fly-to
 * offset is measured off the real element rather than assumed, since the
 * column grows with the reader's text size; this is only the pre-measurement
 * fallback for the very first frame. */
const PANEL_WIDTH_FALLBACK_PX = 480;

/** Header cluster's own footprint on mobile — the pin fly-to keeps clear of
 * it so a selected pin doesn't land underneath the chrome. Measured rather
 * than hard-coded: the row grows with the reader's text size, and the notch
 * adds its own inset on top. The constant is only the pre-measurement
 * fallback for the very first frame. */
const HEADER_BOTTOM_FALLBACK_PX = 64;

/** Matches the scrim's `duration-200` so the mobile list panel leaves
 * together with the dimming behind it, instead of vanishing instantly while
 * the scrim is still mid-fade over whatever replaced it. */
const LIST_FADE_MS = 200;

type View = "map" | "list" | "detail";

export function MapShell() {
  const [locale, setLocale] = useState<Locale>("en");
  const [view, setView] = useState<View>("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [about, setAbout] = useState(false);
  const [locating, setLocating] = useState(false);

  // Kept mounted slightly past `view` leaving "list" so it can fade out
  // instead of disappearing on the spot; opening is instant (both flip
  // before paint, via useLayoutEffect) since only the close needs to sync
  // with the scrim's own fade. A plain useEffect here would run after the
  // browser had already painted the stale bottom-bar branch for one frame
  // (mount state hasn't caught up to `view` yet) — visible as a flash
  // whenever list opens fast enough, e.g. tapping search then list in quick
  // succession.
  const [listMounted, setListMounted] = useState(false);
  const [listEntered, setListEntered] = useState(false);
  useLayoutEffect(() => {
    if (view === "list") {
      // Both flags have to land before the browser paints, which is the one
      // thing this rule exists to discourage — see the note above.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setListMounted(true);
      setListEntered(true);
      return;
    }
    setListEntered(false);
    const id = setTimeout(() => setListMounted(false), LIST_FADE_MS);
    return () => clearTimeout(id);
  }, [view]);

  const mapRef = useRef<MapCanvasHandle>(null);
  const isDesktop = useIsDesktop();

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerInset, setHeaderInset] = useState(HEADER_BOTTOM_FALLBACK_PX);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const read = () => setHeaderInset(el.getBoundingClientRect().bottom);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    window.addEventListener("resize", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, []);

  const panelRef = useRef<HTMLElement>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH_FALLBACK_PX);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPanelWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, isDesktop]);
  const church = selected ? getChurch(selected) : undefined;
  // Every church sharing `church`'s pin (including itself), resolved for the
  // detail panel's own tab row. A church with no `group` has no siblings.
  const siblingChurches = useMemo(
    () =>
      church?.group
        ? church.group.map(getChurch).filter((c): c is NonNullable<typeof c> => !!c)
        : [],
    [church]
  );

  const results = useMemo(
    () => searchChurches(churches, query, locale),
    [query, locale]
  );

  const listed = useMemo(
    () => (region ? churches.filter((c) => c.region === region) : churches),
    [region]
  );

  // The scrim covers the map and the header, but never the active surface.
  const scrimUp = view === "list" || (searching && query.trim().length > 0);

  const openChurch = (slug: string) => {
    setSelected(slug);
    setView("detail");
    setSearching(false);
    setQuery("");
  };

  // Switching tabs within a shared pin's detail — unlike `openChurch`, this
  // doesn't touch search/view, and (via `resetKey` below, keyed off the
  // group's first slug rather than `selected`) doesn't collapse the mobile
  // sheet back to Peek either. It's still the same site.
  const switchChurch = (slug: string) => setSelected(slug);

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  // The mobile search overlay's own X always closes the whole panel back to
  // the map — even when search was opened from inside the list — rather than
  // just dropping back to whatever view was underneath.
  const closeSearchPanel = () => {
    closeSearch();
    setView("map");
  };

  // On mobile, an active search takes over the whole screen (matching the
  // mockups) rather than showing a dropdown under a bottom-anchored field —
  // there'd be nowhere for a dropdown to go with the keyboard covering the
  // bottom half of the screen. It supersedes whatever view was showing
  // (map, list) rather than layering on top of it, so this doesn't check
  // `view` at all — search focused from inside the list panel swaps to the
  // same full-screen search state, not a dropdown stacked over the list.
  const mobileSearchOverlay = !isDesktop && searching;

  // Both mobile surfaces cover the whole screen, so Tab has nowhere
  // legitimate to go outside them, and closing one should hand focus back to
  // whatever opened it rather than dropping it at the top of the document.
  const searchOverlayRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);
  useFocusTrap(searchOverlayRef, mobileSearchOverlay);
  useFocusTrap(listRef, !isDesktop && view === "list");
  useFocusReturn(mobileSearchOverlay);
  useFocusReturn(!isDesktop && view === "list");

  // Opening the list is also the one place search needs to be explicitly
  // dismissed — otherwise it stays open underneath and reappears (stacked
  // on top of the list) the moment the field regains focus.
  const openList = () => {
    closeSearch();
    setView("list");
  };

  const closePanel = () => {
    setView("map");
    setSelected(null);
    // A swipe-to-dismiss on the mobile sheet can still have momentum when it
    // closes — without this, that same motion immediately pans or zooms the
    // map now sitting where the sheet was.
    mapRef.current?.suspendInteraction(300);
  };

  // The leading square opens the list everywhere except in the list itself,
  // where it closes back to the map. Detail is dismissed from inside the
  // field instead, which is what the mockups show.
  const inList = view === "list";
  // Floating over the map it carries a shadow; inside the panel strip it
  // carries a stroke instead. The border is always present so the box stays
  // exactly 48x48.
  //
  // This is about where the cluster physically sits, which is not the same
  // question as which view is active. On mobile the bottom bar keeps
  // floating over the map through the detail view too — it stays rendered,
  // and the sheet simply rises over it — so keying this off `view === "map"`
  // alone made it swap to its docked hairline the instant a pin was tapped,
  // visible as a flash of borders in the frames before the sheet covered it.
  const elevated = view === "map" || (!isDesktop && view === "detail");
  const leadingButton = (
    <button
      type="button"
      onClick={() => (inList ? closePanel() : openList())}
      aria-label={inList ? t(locale, "closeList") : t(locale, "openList")}
      className={`relative z-0 grid size-6 shrink-0 place-items-center rounded-card border bg-offwhite text-brown transition-colors hover:bg-cream ${
        elevated ? "border-transparent shadow-float" : "border-stroke"
      }`}
    >
      <Icon name={inList ? "close" : "list"} />
    </button>
  );

  const locate = () => {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Zoom lives only in the desktop bottom-right stack; on mobile it's dropped
  // and this button — styled identically to the leading list/close square —
  // takes its place at the right end of the search bar instead.
  const mobileLocateButton = (
    <button
      type="button"
      onClick={locate}
      aria-label={t(locale, "locate")}
      aria-busy={locating}
      className={`relative z-0 grid size-6 shrink-0 place-items-center rounded-card border bg-offwhite text-brown transition-colors hover:bg-cream ${
        elevated ? "border-transparent shadow-float" : "border-stroke"
      }`}
    >
      <Icon name="my-location" className={locating ? "opacity-50" : ""} />
    </button>
  );

  // The floating desktop bar (view === "map") shows results as a dropdown
  // card over the map — nothing else occupies that space, so overlaying is
  // fine there. Anywhere the field sits inside the 480px panel strip
  // (list/detail), a dropdown would float over the list/detail body still
  // visible underneath — the same stacking bug as the old mobile behaviour.
  // `showDropdown` opts out of the dropdown in that case; the panel body
  // swaps to full-bleed results instead (see the desktop aside below).
  const searchCluster = (showDropdown: boolean, showLocate = true) => (
    <div className="flex gap-1">
      {leadingButton}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <SearchBar
          value={query}
          onChange={(v) => {
            setQuery(v);
            setSearching(true);
          }}
          onFocus={() => setSearching(true)}
          placeholder={t(locale, "searchPlaceholder")}
          clearLabel={t(locale, "clearSearch")}
          onClear={() => {
            setQuery("");
            setSearching(false);
          }}
          trailingAction={
            view === "detail"
              ? { label: t(locale, "closePanel"), onClick: closePanel }
              : undefined
          }
          elevated={elevated}
        />
        {showDropdown && searching ? (
          <div className="absolute top-full right-0 left-0">
            <SearchResults
              results={results}
              locale={locale}
              onSelect={openChurch}
              query={query}
            />
          </div>
        ) : null}
      </div>
      {!isDesktop && showLocate ? mobileLocateButton : null}
    </div>
  );

  const listBody = (
    <>
      <RegionChips
        regions={regions}
        active={region}
        onChange={setRegion}
        allLabel={t(locale, "all")}
      />
      {listed.length === 0 ? (
        <p className="px-3 py-3 font-ui text-sm text-warm">
          {t(locale, "emptyRegion")}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {listed.map((c) => (
            <li key={c.slug}>
              <ChurchRow
                church={c}
                locale={locale}
                onSelect={openChurch}
                selected={c.slug === selected}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-cream">
      <MapCanvas
        ref={mapRef}
        churches={churches}
        selected={selected}
        onSelect={openChurch}
        panelOffset={isDesktop && view !== "map" ? panelWidth : 0}
        topInset={!isDesktop ? headerInset : 0}
        bottomInsetFraction={!isDesktop && view === "detail" ? 1 - PEEK_TOP_FRACTION : 0}
        label={t(locale, "mapLabel")}
      />

      {/* Zoom is desktop-only; on mobile the locate button moves inline next
          to the search bar instead (see mobileLocateButton above). */}
      {isDesktop ? (
        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onLocate={locate}
          locating={locating}
          labels={{
            zoomIn: t(locale, "zoomIn"),
            zoomOut: t(locale, "zoomOut"),
            locate: t(locale, "locate"),
          }}
        />
      ) : null}

      <HeaderCluster
        ref={headerRef}
        locale={locale}
        onLocaleChange={setLocale}
        onAbout={() => setAbout(true)}
      />

      {/* Dims map + header, sits under the panel and the search cluster. */}
      <div
        aria-hidden={!scrimUp}
        onClick={() => {
          if (searching) setSearching(false);
        }}
        className={`fixed inset-0 z-20 bg-scrim transition-opacity duration-200 ${
          scrimUp ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {isDesktop ? (
        <>
          {/* Same column as the panel, less the 16px inset on both sides —
              so the field is the same width whether it floats over the map or
              sits in the panel strip, and never resizes between states. */}
          {view === "map" ? (
            <div className="fixed top-2 left-2 z-30 w-[calc(30rem-2rem)]">
              {searchCluster(true)}
            </div>
          ) : (
            <aside
              ref={panelRef}
              aria-label={view === "list" ? t(locale, "churchList") : undefined}
              className="fixed inset-y-0 left-0 z-30 flex w-[30rem] flex-col bg-offwhite shadow-panel"
            >
              <div className="shrink-0 bg-cream p-2">{searchCluster(false)}</div>
              {searching ? (
                <SearchResults
                  results={results}
                  locale={locale}
                  onSelect={openChurch}
                  query={query}
                  bleed
                />
              ) : view === "list" ? (
                listBody
              ) : church ? (
                <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
                  <ChurchDetail
                    church={church}
                    siblings={siblingChurches}
                    onSwitch={switchChurch}
                    locale={locale}
                    eyebrow="category"
                  />
                </div>
              ) : null}
            </aside>
          )}
        </>
      ) : (
        <>
          {mobileSearchOverlay ? (
            <aside
              ref={searchOverlayRef}
              aria-label={t(locale, "searchPlaceholder")}
              className="safe-t fixed inset-0 z-30 flex flex-col bg-offwhite"
            >
              <div className="shrink-0 bg-cream p-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={openList}
                    aria-label={t(locale, "openList")}
                    className="relative z-0 grid size-6 shrink-0 place-items-center rounded-card border border-stroke bg-offwhite text-brown transition-colors hover:bg-cream"
                  >
                    <Icon name="list" />
                  </button>
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    autoFocus
                    placeholder={t(locale, "searchPlaceholder")}
                    clearLabel={t(locale, "clearSearch")}
                    onClear={() => setQuery("")}
                    // Blur-to-close raced the list button's own click — a
                    // mousedown on that button blurs the field first, and if
                    // that blur unmounts the overlay, the click never lands.
                    // An explicit close button in the field sidesteps that
                    // entirely: shown whenever there's no text to clear yet.
                    trailingAction={{ label: t(locale, "closePanel"), onClick: closeSearchPanel }}
                    elevated={false}
                  />
                </div>
              </div>
              <SearchResults
                results={results}
                locale={locale}
                onSelect={openChurch}
                query={query}
                bleed
              />
            </aside>
          ) : listMounted ? (
            <aside
              ref={listRef}
              aria-label={t(locale, "churchList")}
              className={`safe-t fixed inset-0 z-30 flex flex-col bg-offwhite transition-opacity duration-200 ${
                listEntered ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="shrink-0 bg-cream p-2">{searchCluster(true, false)}</div>
              {listBody}
            </aside>
          ) : (
            // `safe-b` keeps the bar clear of the home indicator: the layout
            // declares `viewportFit: cover`, so the viewport runs underneath it.
            <div className="safe-b safe-x fixed inset-x-2 bottom-2 z-30">
              {searchCluster(true)}
            </div>
          )}

          <BottomSheet
            open={view === "detail" && !!church}
            onClose={closePanel}
            label={church?.name[locale] ?? ""}
            // Keyed off the group's own first slug (or the plain slug for a
            // church with no siblings) rather than `selected` itself, so
            // switching tabs on a shared pin doesn't collapse the sheet back
            // to Peek — that reset is for switching to a different site.
            resetKey={church?.group?.[0] ?? selected ?? undefined}
          >
            {church ? (
              <ChurchDetail
                church={church}
                siblings={siblingChurches}
                onSwitch={switchChurch}
                locale={locale}
                eyebrow="parish"
              />
            ) : null}
          </BottomSheet>
        </>
      )}

      {about ? <AboutModal locale={locale} onClose={() => setAbout(false)} /> : null}
    </main>
  );
}
