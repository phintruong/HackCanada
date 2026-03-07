'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface CongestionLayerProps {
  map: mapboxgl.Map | null;
  hospitals: any[];
  congestion: any[];
}

function getOccupancyLabel(pct: number): string {
  if (pct < 40) return 'Low';
  if (pct < 60) return 'Moderate';
  if (pct < 80) return 'High';
  return 'Critical';
}

function getOccupancyColor(pct: number): string {
  if (pct < 40) return '#22c55e';
  if (pct < 60) return '#eab308';
  if (pct < 80) return '#f97316';
  return '#dc2626';
}

export default function CongestionLayer({ map, hospitals, congestion }: CongestionLayerProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Close popup on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        popupRef.current?.remove();
        popupRef.current = null;
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (!map || hospitals.length === 0) return;

    const loadMap: Record<string, number> = {};
    for (const s of congestion) {
      loadMap[s.hospitalId] = s.occupancyPct;
    }

    // Build a lookup for full hospital data
    const hospitalMap: Record<string, any> = {};
    for (const h of hospitals) {
      hospitalMap[h._id ?? h.id] = h;
    }

    const features = hospitals.map((h: any) => {
      const pct = loadMap[h._id ?? h.id] ?? 70;
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [h.longitude, h.latitude]
        },
        properties: {
          name: h.name,
          occupancyPct: pct,
          id: h._id ?? h.id,
          erBeds: h.erBeds ?? 0,
          totalBeds: h.totalBeds ?? 0,
          phone: h.phone ?? '',
          specialties: Array.isArray(h.specialties) ? h.specialties.join(', ') : '',
          website: h.website ?? '',
          waitMinutes: loadMap[h._id ?? h.id] ? Math.round((loadMap[h._id ?? h.id] / 100) * 180 + 30) : 60,
        }
      };
    });

    const sourceId = 'hospital-congestion';
    const layerId = 'hospital-circles';

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features
      });
      return;
    }

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features }
    });

    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'occupancyPct'],
          0, 12,
          100, 30
        ],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'occupancyPct'],
          0, '#22c55e',
          50, '#eab308',
          75, '#f97316',
          100, '#dc2626'
        ],
        'circle-opacity': 0.7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    map.addLayer({
      id: 'hospital-labels',
      type: 'symbol',
      source: sourceId,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 2.5],
        'text-anchor': 'top',
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular']
      },
      paint: {
        'text-color': '#e2e8f0',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.5
      }
    });

    // --- Click handler: show popup with hospital stats ---
    map.on('click', layerId, (e) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const props = feat.properties!;
      const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      const pct = Math.round(props.occupancyPct ?? 70);
      const color = getOccupancyColor(pct);
      const label = getOccupancyLabel(pct);
      const specialties = props.specialties
        ? props.specialties.split(', ').map((s: string) =>
          `<span style="
              display:inline-block; padding:2px 8px; margin:2px 3px 2px 0;
              border-radius:9999px; font-size:10px; font-weight:600;
              background:rgba(255,255,255,0.08); color:#94a3b8;
              border:1px solid rgba(255,255,255,0.1);
            ">${s}</span>`
        ).join('')
        : '';

      const html = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-width: 240px; max-width: 300px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 12px; padding: 16px;
          color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        ">
          <div style="font-size:15px; font-weight:700; margin-bottom:10px; color:#f8fafc;">
            ${props.name}
          </div>

          <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-size:11px; color:#94a3b8;">Occupancy</span>
              <span style="font-size:11px; font-weight:700; color:${color};">${pct}% — ${label}</span>
            </div>
            <div style="
              width:100%; height:6px; border-radius:3px;
              background:rgba(255,255,255,0.08); overflow:hidden;
            ">
              <div style="
                width:${pct}%; height:100%; border-radius:3px;
                background:${color}; transition:width 0.3s;
              "></div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
            <div style="
              background:rgba(255,255,255,0.05); border-radius:8px; padding:8px;
              text-align:center; border:1px solid rgba(255,255,255,0.06);
            ">
              <div style="font-size:18px; font-weight:800; color:#f8fafc;">${props.erBeds}</div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">ER Beds</div>
            </div>
            <div style="
              background:rgba(255,255,255,0.05); border-radius:8px; padding:8px;
              text-align:center; border:1px solid rgba(255,255,255,0.06);
            ">
              <div style="font-size:18px; font-weight:800; color:#f8fafc;">${props.totalBeds}</div>
              <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Total Beds</div>
            </div>
          </div>

          ${specialties ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Specialties</div>
            <div style="display:flex; flex-wrap:wrap;">${specialties}</div>
          </div>
          ` : ''}

          ${props.phone ? `
          <div style="
            display:flex; align-items:center; gap:6px;
            font-size:12px; color:#38bdf8;
          ">
            📞 <a href="tel:${props.phone}" style="color:#38bdf8; text-decoration:none;">${props.phone}</a>
          </div>
          ` : ''}
        </div>
      `;

      // Close any existing popup
      popupRef.current?.remove();

      // Inject popup override CSS once
      if (!document.getElementById('hospital-popup-css')) {
        const style = document.createElement('style');
        style.id = 'hospital-popup-css';
        style.textContent = `
          .hospital-stats-popup .mapboxgl-popup-content {
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 12px !important;
          }
          .hospital-stats-popup .mapboxgl-popup-tip {
            display: none !important;
          }
          .hospital-stats-popup .mapboxgl-popup-close-button {
            color: #94a3b8;
            font-size: 18px;
            right: 8px;
            top: 8px;
          }
          .hospital-stats-popup .mapboxgl-popup-close-button:hover {
            color: #f8fafc;
            background: transparent;
          }
        `;
        document.head.appendChild(style);
      }

      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: true,
        maxWidth: '320px',
        className: 'hospital-stats-popup',
        offset: 15,
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    });

    // --- Cursor pointer on hover ---
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      popupRef.current?.remove();
      if (map.getLayer('hospital-labels')) map.removeLayer('hospital-labels');
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, hospitals, congestion]);

  return null;
}

