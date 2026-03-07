import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface CreateMapOptions {
  container: HTMLDivElement;
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** When false, do not add the global composite "3d-buildings" layer. Default true. */
  addGlobalBuildings?: boolean;
}

/**
 * Returns the first symbol layer id in the current style, for inserting layers below labels.
 */
export function getFirstSymbolLayerId(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle().layers;
  return layers?.find(
    (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
  )?.id;
}

/** Layer id patterns for street/road labels - hide these to remove street names. */
const STREET_LABEL_PATTERN = /(road|street).*label|label.*(road|street)/i;

/** Layer id patterns for minor roads - hide these to show only major roads. */
const MINOR_ROAD_PATTERN = /road-(street|minor|link)(-|$)/i;

/**
 * Hides street-name labels and minor road layers so only major roads remain visible.
 * Call after map style has loaded.
 */
function hideStreetNamesAndMinorRoads(map: mapboxgl.Map): void {
  const layers = map.getStyle().layers;
  if (!layers) return;
  for (const layer of layers) {
    const id = layer.id;
    if (STREET_LABEL_PATTERN.test(id)) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {
        // Layer might not support layout or already removed
      }
    }
    if (MINOR_ROAD_PATTERN.test(id)) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {
        // Ignore if layer doesn't support layout visibility
      }
    }
  }
}

/**
 * Creates a Mapbox map with optional global 3D buildings layer, navigation controls,
 * and map.resize() after load. Used by ClearPathMap.
 * When addGlobalBuildings is false, only the base map is shown; custom extrusion
 * layers (hospital footprints, landmarks) are added by layer components.
 */
export function createMapboxMap(options: CreateMapOptions): mapboxgl.Map {
  const {
    container,
    center,
    zoom,
    pitch = 45,
    bearing = -17.6,
    addGlobalBuildings = true,
  } = options;

  const map = new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/dark-v11',
    center,
    zoom,
    pitch,
    bearing,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  map.on('load', () => {
    hideStreetNamesAndMinorRoads(map);
    if (addGlobalBuildings) {
      const labelLayerId = getFirstSymbolLayerId(map);
      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );
    }
    map.resize();
  });

  return map;
}
