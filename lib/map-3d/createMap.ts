import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface CreateMapOptions {
  container: HTMLDivElement;
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

/**
 * Creates a Mapbox map with 3D buildings (fill-extrusion), navigation controls,
 * and calls map.resize() after load. Shared with map-3d and optionally ClearPath.
 */
export function createMapboxMap(options: CreateMapOptions): mapboxgl.Map {
  const { container, center, zoom, pitch = 45, bearing = -17.6 } = options;

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
    const layers = map.getStyle().layers;
    const labelLayerId = layers?.find(
      (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
    )?.id;

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

    map.resize();
  });

  return map;
}
