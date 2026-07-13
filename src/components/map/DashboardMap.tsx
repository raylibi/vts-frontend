'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export interface TruckPin {
  trip_id: number;
  kode_truk: string;
  lat: number;
  lon: number;
  completeness_pct: number;
}

interface Props {
  trucks: Map<number, TruckPin>;
}

export default function DashboardMap({ trucks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());

  // ── Init map sekali (static import = cleanup synchronous, aman di Strict Mode)
  useEffect(() => {
    if (!containerRef.current) return;

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
      center: [107.6191, -6.9175],
      zoom: 9,
    });

    mapRef.current = map;

    // Pastikan peta menyesuaikan ukuran saat container reflow (rotasi layar,
    // layout stack→row di breakpoint, panel muncul/hilang) — bukan hanya saat
    // window resize. ResizeObserver menangani perubahan ukuran container apa pun.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Tambah / pindahkan / hapus marker saat trucks berubah
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      // Hapus marker yang trip-nya sudah tidak aktif
      const toRemove: number[] = [];
      markersRef.current.forEach((_, id) => {
        if (!trucks.has(id)) toRemove.push(id);
      });
      toRemove.forEach((id) => {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      });

      // Tambah atau pindahkan marker yang aktif
      trucks.forEach((truck) => {
        const existing = markersRef.current.get(truck.trip_id);
        if (existing) {
          existing.setLngLat([truck.lon, truck.lat]);
        } else {
          const marker = new maplibregl.Marker({ element: makeTruckEl(truck) })
            .setLngLat([truck.lon, truck.lat])
            .addTo(map);
          markersRef.current.set(truck.trip_id, marker);
        }
      });
    };

    // Langsung sync tanpa menunggu map 'load': marker MapLibre adalah overlay
    // DOM yang aman dipasang/dipindah kapan pun. Menggerbang dengan map.loaded()
    // berbahaya — loaded() false setiap ada tile yang sedang diunduh, dan event
    // 'load' hanya terbit sekali seumur hidup peta, jadi sync yang "dititipkan"
    // ke once('load') tidak pernah jalan → marker beku sampai halaman di-refresh.
    sync();
  }, [trucks]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

function makeTruckEl(truck: TruckPin): HTMLElement {
  const warn = truck.completeness_pct < 100;
  const color = warn ? '#f59e0b' : '#14c896';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center';
  wrap.innerHTML = `
    <div style="
      width:36px;height:36px;border-radius:50%;
      border:2px solid ${color};background:#0f1628;
      display:flex;align-items:center;justify-content:center;cursor:pointer;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="${color}" stroke-width="1.8">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 5v4h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
    <div style="
      font-size:10px;font-family:'Space Mono',monospace;color:${color};
      background:rgba(10,14,26,0.9);padding:2px 6px;border-radius:4px;
      border:1px solid ${warn ? 'rgba(245,158,11,0.3)' : 'rgba(20,200,160,0.2)'};
      text-align:center;margin-top:3px;white-space:nowrap;
    ">${truck.kode_truk}</div>
  `;
  return wrap;
}
