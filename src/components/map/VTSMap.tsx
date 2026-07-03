'use client';

// src/components/map/VTSMap.tsx
// Wrapper MapLibre GL yang reusable — dipakai di dashboard, armada detail, tracking

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';

export interface TruckMarkerData {
  id: number | string;
  lat: number;
  lon: number;
  label: string;
  warn?: boolean;
}

/** Methods yang bisa dipanggil parent via ref */
export interface VTSMapRef {
  updateMarker: (id: number | string, lat: number, lon: number) => void;
  panTo: (lat: number, lon: number, zoom?: number) => void;
  addMarker: (data: TruckMarkerData) => void;
}

interface VTSMapProps {
  initialCenter?: [number, number]; // [lon, lat]
  initialZoom?: number;
  markers?: TruckMarkerData[];
  className?: string;
  style?: React.CSSProperties;
}

function createMarkerEl(label: string, warn: boolean): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
  const color = warn ? '#f59e0b' : '#14c896';
  el.innerHTML = `
    <div style="width:36px;height:36px;border-radius:50%;border:2px solid ${color};background:#0f1628;display:flex;align-items:center;justify-content:center;position:relative;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 5v4h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
    <div style="font-size:10px;font-family:'Space Mono',monospace;color:${color};background:rgba(10,14,26,0.9);padding:2px 6px;border-radius:4px;border:1px solid ${warn ? 'rgba(245,158,11,0.25)' : 'rgba(20,200,160,0.2)'};margin-top:3px;white-space:nowrap;">
      ${label}${warn ? ' ⚠' : ''}
    </div>
  `;
  return el;
}

const VTSMap = forwardRef<VTSMapRef, VTSMapProps>(function VTSMap(
  {
    initialCenter = [107.6191, -6.9175],
    initialZoom = 10,
    markers = [],
    className = '',
    style,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<number | string, MapLibreMarker>>(new Map());
  // Simpan Marker class setelah dynamic import agar bisa dipakai di addMarker
  const MarkerClassRef = useRef<typeof import('maplibre-gl').Marker | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  // Expose methods ke parent
  useImperativeHandle(ref, () => ({
    updateMarker(id, lat, lon) {
      const marker = markersRef.current.get(id);
      if (marker) marker.setLngLat([lon, lat]);
    },
    panTo(lat, lon, zoom) {
      if (!mapRef.current) return;
      mapRef.current.flyTo({ center: [lon, lat], zoom: zoom ?? mapRef.current.getZoom(), duration: 800 });
    },
    addMarker(data) {
      if (!mapRef.current || !MarkerClassRef.current) return;
      const el = createMarkerEl(data.label, data.warn ?? false);
      const marker = new MarkerClassRef.current({ element: el })
        .setLngLat([data.lon, data.lat])
        .addTo(mapRef.current);
      markersRef.current.set(data.id, marker);
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('maplibre-gl').then((maplibregl) => {
      if (!containerRef.current) return;

      // Simpan Marker class agar addMarker di useImperativeHandle bisa akses
      MarkerClassRef.current = maplibregl.Marker;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: initialCenter,
        zoom: initialZoom,
      });

      mapRef.current = map;

      // Sesuaikan ukuran peta saat container reflow (rotasi layar / breakpoint)
      const ro = new ResizeObserver(() => map.resize());
      if (containerRef.current) ro.observe(containerRef.current);
      resizeObsRef.current = ro;

      // Pasang marker awal setelah map load
      map.on('load', () => {
        markers.forEach((m) => {
          const el = createMarkerEl(m.label, m.warn ?? false);
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([m.lon, m.lat])
            .addTo(map);
          markersRef.current.set(m.id, marker);
        });
      });

    });

    return () => {
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative ${className}`} style={style}>
      <div ref={containerRef} className="absolute inset-0" />
      {/* Label overlay */}
      <div
        className="absolute top-3 left-3 text-xs uppercase tracking-widest pointer-events-none z-10"
        style={{ fontFamily: "'Space Mono', monospace", color: 'rgba(20,200,160,0.4)' }}
      >
        OpenStreetMap · MapLibre GL JS
      </div>
    </div>
  );
});

export default VTSMap;