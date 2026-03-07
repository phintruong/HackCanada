MAPBOX 3D MAP — IMPLEMENTATION PLAN (UPDATED)
=============================================

Overview: Use only the **map page** (`/map`). On it, show 3D for (1) **hospital buildings** (real OSM footprints) and (2) **iconic city landmarks** (e.g. CN Tower). Do **not** show the global Mapbox "all buildings" layer. Remove the map-3d page/route; ClearPathMap is the single map and uses shared Mapbox init plus custom extrusion layers.


1. WHAT IS SHOWN IN 3D
-----------------------

- **Hospital buildings**: Real building footprints from OpenStreetMap (Overpass), rendered as fill-extrusion. One GeoJSON file per city: `public/map-data/hospital-footprints-{city}.geojson`.
- **Iconic landmarks**: One or two per city (e.g. CN Tower for Toronto), with explicit height overrides (e.g. 553 m). Stored in `public/map-data/landmarks-{city}.geojson`.
- **Do NOT show**: The global Mapbox composite "all buildings" layer (no generic houses/buildings). The shared map init must support turning that layer off (`addGlobalBuildings: false`).


2. ROUTE AND SCOPE
------------------

- **Single map**: Only `/map` (app/map/page.tsx). No separate map-3d route.
- **Remove**: app/map-3d/ and map-3d-only components (Mapbox3DMap, CitySelector, HospitalMarkersLayer, HospitalPopup).
- ClearPathMap uses shared Mapbox initialization from `lib/mapbox/createMap.ts` and adds HospitalFootprintsLayer + LandmarksLayer when the map is ready.


3. FILES TO CREATE
------------------

  Path                                              | Purpose
  ---------------------------------------------------|----------------------------------------------------------------------------------------------------
  lib/mapbox/createMap.ts                            | Shared Mapbox init; optional global 3D buildings layer; used by ClearPathMap only (map-3d removed).
  scripts/fetchHospitalFootprints.ts                 | Overpass query per city; hospital building ways; GeoJSON with height. Height fallback: height OR building:levels * 3 OR default 12. Writes hospital-footprints-{city}.geojson.
  public/map-data/landmarks-{city}.geojson           | Iconic landmarks per city (e.g. CN Tower); polygon + properties including explicit height override (e.g. 553).
  public/map-data/hospital-footprints-{city}.geojson | Output of fetch script; polygon features with height, min_height?, name?.
  components/clearpath/HospitalFootprintsLayer.tsx   | Loads hospital-footprints-{cityId}.geojson; adds GeoJSON source + fill-extrusion. Insert layer below first symbol layer so map labels remain visible.
  components/clearpath/LandmarksLayer.tsx            | Loads landmarks-{cityId}.geojson; adds GeoJSON source + fill-extrusion. Supports explicit height in feature properties (e.g. CN Tower 553). Insert layer below first symbol layer.


4. FILES TO MODIFY
------------------

  Path                              | Change
  ----------------------------------|----------------------------------------------------------------------------------------------------------------------------------
  lib/mapbox/createMap.ts           | Add `addGlobalBuildings?: boolean` (default true). When false, do not add the composite "3d-buildings" layer. When adding any extrusion in this helper, insert below first symbol layer (see section 8).
  components/clearpath/ClearPathMap.tsx | (1) Use createMap from `@/lib/mapbox/createMap` with addGlobalBuildings: false. (2) When map ready, add HospitalFootprintsLayer and LandmarksLayer (city e.g. toronto). (3) On unmount, call map.remove() to avoid WebGL leaks.


5. FILES TO DELETE / RELOCATE
-----------------------------

- **Delete**: app/map-3d/, Mapbox3DMap, CitySelector, HospitalMarkersLayer, HospitalPopup.
- **Move** (if they exist): lib/map-3d/createMap.ts to lib/mapbox/createMap.ts (then remove lib/map-3d/createMap.ts). LandmarksLayer lives at components/clearpath/LandmarksLayer.tsx (ClearPath map system), not components/map-3d/.


6. LANDMARK DATA STORAGE AND HEIGHT
------------------------------------

- **Path**: `public/map-data/landmarks-{city}.geojson` (e.g. landmarks-toronto.geojson). Do not store in lib (e.g. not lib/map-3d/landmarks.ts).
- **Content**: FeatureCollection of Polygon features. Each feature may have properties: `height` (number, optional explicit override in metres, e.g. 553 for CN Tower), `min_height` (optional), `name` (optional). If `height` is present in the GeoJSON, use it; otherwise a default can be applied in the layer.
- **Purpose**: Explicit height overrides for iconic structures (e.g. CN Tower 553 m) so they render at correct scale.


7. HOSPITAL FOOTPRINT SCRIPT — HEIGHT FALLBACK
-----------------------------------------------

In scripts/fetchHospitalFootprints.ts, when converting OSM ways to GeoJSON features, use this height rule:

  height = (explicit OSM "height" tag, if parseable) OR (building:levels * 3) OR default 12

- Parse `height` tag first (numeric part, metres).
- Else if `building:levels` exists, use levels * 3 (metres per level).
- Else use default 12 (metres).

Output: `public/map-data/hospital-footprints-{cityId}.geojson` with polygon features and height/min_height/name properties.


8. EXTRUSION LAYER INSERTION (LABELS VISIBLE)
----------------------------------------------

When adding any fill-extrusion layer (in createMap, HospitalFootprintsLayer, or LandmarksLayer), insert it **below the first symbol layer** of the current style so that map labels (place names, road labels) remain visible above the 3D geometry.

- Get style layers: `map.getStyle().layers`.
- Find the first layer where `layer.type === 'symbol'` (and optionally `layer.layout?.['text-field']`).
- Use `map.addLayer(layerSpec, firstSymbolLayerId)` so the new layer is inserted before that symbol layer.


9. CLEARPATH MAP CLEANUP (WEBGL LEAKS)
---------------------------------------

When ClearPathMap unmounts, the map instance must be fully disposed. In the useEffect cleanup (or equivalent):

- Call `map.remove()` on the Mapbox map instance before nulling the ref. This destroys the WebGL context and avoids leaks when navigating away from the map page.


10. DATA FLOW SUMMARY
----------------------

- **Landmarks**: Static (or hand-authored) GeoJSON at `public/map-data/landmarks-{city}.geojson`; LandmarksLayer loads and adds source + fill-extrusion (below first symbol layer). Height from feature property when present.
- **Hospitals 3D**: scripts/fetchHospitalFootprints.ts → Overpass → `public/map-data/hospital-footprints-{city}.geojson`; HospitalFootprintsLayer loads and adds source + fill-extrusion (below first symbol layer). Height from script rule: height OR building:levels*3 OR 12.
- **Map init**: lib/mapbox/createMap.ts with addGlobalBuildings: false (no global buildings). ClearPathMap adds HospitalFootprintsLayer + LandmarksLayer when map is ready; on unmount calls map.remove().


11. PITFALLS (UNCHANGED WHERE RELEVANT)
----------------------------------------

- NEXT_PUBLIC_MAPBOX_TOKEN must be set for client-side map.
- Single map instance; no re-creation on city change (only flyTo if city is ever switched).
- Cleanup: ClearPathMap calls map.remove() on unmount; layer components remove their sources/layers on unmount.
