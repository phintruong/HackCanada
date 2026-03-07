MAPBOX 3D MAP PAGE — IMPLEMENTATION PLAN
=========================================

Overview: Add a new Mapbox 3D map page at a dedicated route (e.g. /map-3d) with Toronto, Kitchener, and Mississauga city selector, 3D buildings, smooth flyTo, mock hospital markers with popups, and a modular structure—styled to match the hero page and reusing existing patterns from the repo.


1. REPOSITORY SUMMARY (REFERENCE)
---------------------------------

- Hero page: app/page.tsx — client component, uses lp wrapper, lp-nav, lp-hero-cta / lp-stmt-cta, Framer Motion, FeatureSteps (components/ui/feature-section.tsx). All .lp-* and button styles live in app/globals.css (@layer components).
- Architecture: App Router only (app/, no pages/). Feature-based components under components/ (e.g. clearpath/, editor/). Utils and domain logic under lib/ (e.g. lib/clearpath/, lib/editor/). Path alias: @/* → project root.
- Existing map: app/map/page.tsx uses ClearPathMap (components/clearpath/ClearPathMap.tsx) — Mapbox mapbox-gl, dark-v11, Toronto center, 3D fill-extrusion, API-driven hospitals/congestion. Token read as process.env.NEXT_PUBLIC_MAPBOX_TOKEN (see env pitfall below).
- Styling: cn() from lib/utils.ts; hero uses Playfair/Archivo, #f4efe6, #1a1611, #8a8279, pill buttons (border-radius 50px), glass panels, hover lift translateY(-2px).


2. ROUTE AND FEATURE PLACEMENT
------------------------------

- New route: Add app/map-3d/page.tsx (new page). Do not replace the existing /map (ClearPath) so current flows stay intact.
- Optional: Add a link to the new map from the hero nav (e.g. "Cities" or "3D Map") in app/page.tsx and/or in the floating nav — only if you want it in the main nav; otherwise the plan does not require changing the hero.


3. FILES TO CREATE
-----------------

  Path                                    | Purpose
  ----------------------------------------|---------------------------------------------------------------------------------------------------
  app/map-3d/page.tsx                      | Client page: layout wrapper (full-height), city selector UI, map container, state (selected city, selected marker for popup), loading state until map ready.
  components/map-3d/Mapbox3DMap.tsx        | Main map component: reuses shared Mapbox init + 3D buildings from lib (see section 6); container ref, mapReady state for loading UI; adds NavigationControl; exposes mapRef / onMapReady.
  components/map-3d/CitySelector.tsx     | Pill-style city switcher (Toronto, Kitchener, Mississauga); copy UI styling from hero (app/page.tsx + globals.css).
  components/map-3d/HospitalMarkersLayer.tsx | Renders mock hospital markers; track in markersRef, remove all markers before creating new ones when city changes or on unmount. Use Mapbox Marker for now (GeoJSON layer could replace later if dataset grows).
  components/map-3d/HospitalPopup.tsx     | Uses Mapbox Popup API to show hospital name + optional details on marker click; accepts one "selected" marker and map instance.
  lib/map-3d/cities.ts                    | City configuration array: id, name, center [lng, lat], zoom, pitch, bearing.
  lib/map-3d/types.ts                    | TypeScript types: CityConfig, HospitalMarker as MapHospitalMarker (id, name, lng, lat, occupancyPct?, waitMinutes?).
  lib/map-3d/mockHospitals.ts           | Mock hospital list per city (Toronto, Kitchener, Mississauga); structure matches MapHospitalMarker.
  lib/map-3d/createMap.ts (or lib/mapbox/initMap.ts) | Shared Mapbox initialization and 3D fill-extrusion layer logic extracted from ClearPathMap.tsx; single source of truth used by both ClearPathMap and Mapbox3DMap.


4. FILES TO MODIFY
------------------

  Path              | Change
  ------------------|--------------------------------------------------------------------------------------------------------------------------------------
  app/globals.css   | Add .map-3d-* classes that copy hero styling (app/page.tsx + globals.css): .map-3d-page, .map-3d-city-btn, .map-3d-city-btn--active, .map-3d-popup, and a simple loading-state class if needed (same fonts, colors, pill radius, hover as lp-*).
  .env              | Add NEXT_PUBLIC_MAPBOX_TOKEN and set it to the Mapbox public token (see section 12). Document that MAPBOX_SECRET_TOKEN is server-only; client map must use NEXT_PUBLIC_MAPBOX_TOKEN.
  components/clearpath/ClearPathMap.tsx | Optional refactor: replace inline map init and 3D layer code with a call to the shared lib/map-3d/createMap.ts (or lib/mapbox/initMap.ts) so both ClearPath and map-3d use the same logic.

No other files need to be modified for the minimal feature set. Optional: add a link to /map-3d in the hero nav in app/page.tsx.


5. COMPONENT STRUCTURE
---------------------

  app/map-3d/page.tsx
    └─ div (full viewport, .map-3d-page or .lp for consistency)
         ├─ CitySelector (currentCity, onCityChange) — positioned e.g. top-left or top-center
         ├─ Mapbox3DMap (cityConfig, onMapReady?)
         │     └─ div.ref (map container)
         ├─ HospitalMarkersLayer (map, hospitals, onMarkerClick) [when mapReady]
         └─ HospitalPopup (map, selectedMarker, onClose) [when mapReady]

- Mapbox3DMap: Owns the Mapbox map instance in a ref; creates map once on mount, on load adds fill-extrusion layer (same technique as ClearPathMap), then runs optional onMapReady(map). Listens to cityConfig and calls map.flyTo() when city changes (smooth transition).
- CitySelector: Presentational; receives currentCity: CityConfig and onCityChange: (city: CityConfig) => void; renders three buttons (Toronto default, Kitchener, Mississauga) with active state; uses new CSS classes that mirror hero (pill, glass or solid, Playfair/Archivo).
- HospitalMarkersLayer: Given map, hospitals: MapHospitalMarker[], and onMarkerClick(marker). Track markers in a markersRef (e.g. ref to array of mapboxgl.Marker). When city changes or on unmount, remove all markers (iterate markersRef and call .remove() on each), then create new ones for the current hospitals. Use Mapbox Marker for now; note that a GeoJSON layer could replace it later if the dataset grows.
- HospitalPopup: Given map, selectedMarker: MapHospitalMarker | null, onClose. When selectedMarker is set, creates/updates a mapboxgl.Popup at marker coords, sets HTML content (name, wait time, occupancy if present), and calls onClose when popup closes. Use .map-3d-popup for content styling.

All under components/map-3d/ and lib/map-3d/ to keep the feature modular and separate from ClearPath.


6. MAP INITIALIZATION STRATEGY (REUSE FROM CLEARPATH)
-----------------------------------------------------

- Reuse existing logic: Do not create a separate map system. Extract the Mapbox initialization and 3D building (fill-extrusion) logic from components/clearpath/ClearPathMap.tsx into a shared helper (e.g. lib/map-3d/createMap.ts or lib/mapbox/initMap.ts). Mapbox3DMap and, if desired, ClearPathMap should use this helper so there is a single source of truth for style, options, and 3D layer.
- Token: Set mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN in the shared init (and ensure .env defines NEXT_PUBLIC_MAPBOX_TOKEN). Do not rely on MAPBOX_SECRET_TOKEN for client-side map.
- Where: Mapbox3DMap calls the shared createMap(container, initialCenter, initialZoom, ...) inside useEffect; on load the helper adds the same fill-extrusion layer as ClearPathMap (dark-v11, composite/building, same paint).
- Resize: After the map loads, call map.resize() to ensure correct rendering.
- Controls: Add zoom/compass controls: map.addControl(new mapboxgl.NavigationControl(), 'bottom-right').
- Loading state: Expose a mapReady (or loading) state from Mapbox3DMap. Page or Mapbox3DMap shows a simple loading state (e.g. spinner or "Loading map…" overlay) until the map has fired 'load' and 3D layer is added; then hide the overlay.
- City changes: Store current city config in parent state. When city changes, call map.flyTo({ center: city.center, zoom: city.zoom, pitch: city.pitch, bearing: city.bearing, duration: 2000 }). No map re-creation; single map instance.
- SSR: Use 'use client' on the page and map component; map is only created inside useEffect in the browser.


7. CITY CONFIGURATION STRUCTURE
------------------------------

File: lib/map-3d/cities.ts

  interface CityConfig {
    id: string;
    name: string;
    center: [number, number];  // [lng, lat]
    zoom: number;
    pitch?: number;
    bearing?: number;
  }

- Toronto: center: [-79.3832, 43.6532], zoom ~11.5, pitch 45 (match ClearPath).
- Kitchener: e.g. center: [-80.4922, 43.4516], zoom ~11.5, pitch 45.
- Mississauga: e.g. center: [-79.6441, 43.5890], zoom ~11.5, pitch 45.

Export a constant array CITIES: CityConfig[] and a helper getCityById(id: string) if needed.


8. MARKER DATA STRUCTURE
------------------------

File: lib/map-3d/types.ts

  interface MapHospitalMarker {
    id: string;
    name: string;
    lng: number;
    lat: number;
    occupancyPct?: number;
    waitMinutes?: number;
  }

File: lib/map-3d/mockHospitals.ts

- Export a function getMockHospitalsByCity(cityId: string): MapHospitalMarker[] or an object MOCK_HOSPITALS: Record<string, MapHospitalMarker[]> with keys toronto, kitchener, mississauga.
- Each city has a small array (e.g. 3–5 mock hospitals) with plausible names and coordinates within that city. This keeps the UI simple and allows later replacement with API or congestion overlays.

Marker rendering: Use Mapbox Marker (mapboxgl.Marker) for now. If the dataset grows, consider replacing with a GeoJSON source + symbol/circle layer for better performance.


9. STATE MANAGEMENT APPROACH
----------------------------

- No global store: Use React component state only (no Redux/Zustand; none in repo).
- Page state (in app/map-3d/page.tsx):
  - selectedCity: CityConfig — default Toronto (first entry in CITIES).
  - selectedMarker: MapHospitalMarker | null — set when a marker is clicked; clear when popup is closed.
- Map instance: Held in a ref inside Mapbox3DMap; optionally passed to children via callback onMapReady(map) or by rendering children that receive map as prop after mapReady is true (current ClearPath pattern).
- Marker list: Derived from lib/map-3d/mockHospitals.ts by selectedCity.id; passed as prop to HospitalMarkersLayer. When city changes, markers update and popup can be cleared.


10. HOW HERO PAGE STYLING WILL BE REUSED (COPY PATTERNS)
--------------------------------------------------------

- Copy UI styling from hero: Copy the UI styling patterns from the hero page (app/page.tsx and app/globals.css). Do not invent new patterns; reuse the same structural and visual language.
- CSS classes in globals.css: Add .map-3d-* classes that mirror hero patterns (same fonts, colors, pill radius, hover behavior as lp-nav-links a, lp-stmt-cta, lp-btn-warm, lp-btn-outline):
  - Container: background #f4efe6 or full-bleed map with a small overlay panel; typography and spacing consistent with lp.
  - City selector: same font (Playfair or Archivo), pill shape (border-radius 50px), padding and letter-spacing as lp-nav-links a or lp-stmt-cta; active state like lp-btn-warm (#1a1611, #f4efe6 text); inactive like lp-btn-outline or lp-hero-cta; hover translateY(-2px).
- Reuse: Use existing cn() from @/lib/utils for conditional classes. Reuse color values: #1a1611, #f4efe6, #8a8279, #3d362c.
- Popup: Popup content styled with .map-3d-popup: same font stack as hero (Archivo, Playfair), small labels (Archivo, uppercase, letter-spacing), title (Playfair).

No need to change existing .lp-* classes; add new classes that follow the same design tokens.


11. POTENTIAL PITFALLS IN THIS REPO
------------------------------------

1. Environment variable: ClearPathMap uses process.env.NEXT_PUBLIC_MAPBOX_TOKEN. The repo's .env only defines MAPBOX_SECRET_TOKEN. For the client-side map to work, NEXT_PUBLIC_MAPBOX_TOKEN must be set (e.g. to the same public token value). Otherwise the map will not load.
2. styled-jsx in ClearPath: ClearPathMap uses <style jsx global>. In App Router this can still work; for the new map page prefer global CSS in globals.css for any keyframes or shared marker styles to avoid dependency on styled-jsx.
3. Mapbox token visibility: Anything set as NEXT_PUBLIC_* is exposed to the browser; use a Mapbox public token (e.g. with scoped URL restrictions), not a secret.
4. Single map instance: Do not create a new map when switching cities; only call flyTo to avoid memory leaks and flicker.
5. Cleanup: HospitalMarkersLayer must properly clean up all markers when switching cities or on unmount: remove each marker from the map before creating the new set for the selected city, to avoid duplicate or stale markers. Same for popup when selectedMarker is cleared or city changes.
6. TypeScript: Use strict types for CityConfig, MapHospitalMarker, and props; the repo uses strict mode.


12. ENVIRONMENT VARIABLES REQUIRED
---------------------------------

  Variable                   | Required | Purpose
  ---------------------------|---------|-----------------------------------------------------------------
  NEXT_PUBLIC_MAPBOX_TOKEN   | Yes     | Mapbox public access token for the 3D map (and existing ClearPath map) in the browser.

- Ensure NEXT_PUBLIC_MAPBOX_TOKEN is used: The shared map initialization (and ClearPathMap) must set mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN. The repo's .env currently has MAPBOX_SECRET_TOKEN only; add NEXT_PUBLIC_MAPBOX_TOKEN for client-side map to work.
- Add to .env: NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ... (use the same public token as in MAPBOX_SECRET_TOKEN if it is a public key, or create a separate public token with appropriate URL restrictions).
- No new server-only env vars are required for the minimal map page with mock data.


13. OPTIONAL LATER EXTENSIONS (MODULAR STRUCTURE)
-------------------------------------------------

The layout is prepared for:

- Hospital data: Replace getMockHospitalsByCity with a fetch to an API (e.g. /api/clearpath/hospitals?city=...) or a dedicated /api/map-3d/hospitals that returns MapHospitalMarker[].
- Congestion overlays: Add a layer component (similar to CongestionLayer) that consumes the same map ref and a congestion data source.
- Simulation layers: Add another layer or panel that receives simulation results and draws on the map (e.g. flow arcs or proposed sites), similar to FlowArcs.

Keeping Mapbox3DMap as a dumb container that only owns the map and 3D buildings, and passing in layers as children or via callbacks, keeps this extensible without touching the hero or ClearPath code.
