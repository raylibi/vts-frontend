'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface Props {
  lat: number;
  lon: number;
  isLost: boolean;
}

export default function PaketMap({ lat, lon, isLost }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const color = isLost ? '#dc2626' : '#16a34a';
    const iconSvg = isLost
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [lon, lat],
      zoom: 14,
    });

    const el = document.createElement('div');
    el.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;border:2.5px solid ${color};background:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.18);position:relative;">${iconSvg}</div>`;

    if (isLost) {
      const pulse = document.createElement('div');
      pulse.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;border-radius:50%;border:2px solid #dc2626;opacity:0;animation:paket-pulse 2s infinite;pointer-events:none;';
      (el.firstElementChild as HTMLElement).appendChild(pulse);

      if (!document.getElementById('paket-pulse-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'paket-pulse-style';
        styleEl.textContent = '@keyframes paket-pulse{0%{transform:translate(-50%,-50%) scale(1);opacity:0.6}100%{transform:translate(-50%,-50%) scale(2);opacity:0}}';
        document.head.appendChild(styleEl);
      }
    }

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lon, lat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    const ro = new ResizeObserver(() => map.resize());
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
