# Map 3D: Implementation plan update (reference)

This doc aligns with [MAPBOX_3D_MAP_IMPLEMENTATION_PLAN.md](MAPBOX_3D_MAP_IMPLEMENTATION_PLAN.md). Use that file as the single implementation plan.

## 3D on the map

- **Hospital buildings**: Real OSM footprints via Overpass → `public/map-data/hospital-footprints-{city}.geojson`. Height fallback: `height` OR `building:levels * 3` OR default `12`.
- **Iconic landmarks**: `public/map-data/landmarks-{city}.geojson` with explicit height overrides (e.g. CN Tower 553 m).
- **Do NOT show**: Global Mapbox "all buildings" layer (`addGlobalBuildings: false`).

## Paths and locations

- **createMap**: `lib/mapbox/createMap.ts` (map-3d feature removed).
- **LandmarksLayer**: `components/clearpath/LandmarksLayer.tsx` (ClearPath map system).
- **Landmark data**: `public/map-data/landmarks-{city}.geojson` (not in lib).

## Layer insertion and cleanup

- Add all fill-extrusion layers **below the first symbol layer** so map labels stay visible.
- On ClearPathMap unmount, call **map.remove()** to avoid WebGL leaks.

## Landmarks GeoJSON

- Features may include explicit `height` (e.g. 553 for CN Tower). Use when present; otherwise apply a default in the layer.
- **CN Tower / realistic models**: The current landmark is a **simplified extruded polygon** (a box at the correct height). Mapbox fill-extrusion cannot show a detailed 3D model (e.g. the real CN Tower shape). For a realistic model you would need: (1) a 3D model file (e.g. GLB) of the CN Tower, and (2) a **custom Mapbox layer** (e.g. [Mapbox GL custom layer](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface) with Three.js, or deck.gl) to render it. That is a larger change and can be added later if desired.
