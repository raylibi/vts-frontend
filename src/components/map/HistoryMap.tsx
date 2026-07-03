'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface GpsPoint {
  latitude: number;
  longitude: number;
  kecepatan_kmh: number | null;
  timestamp: string;
}

interface AlertPin {
  lat: number;
  lon: number;
  kode_paket: string;
  timestamp: string;
}

interface Props {
  track: GpsPoint[];
  alertPins?: AlertPin[];
  replayIndex?: number;
}

export default function HistoryMap({ track, alertPins = [], replayIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const replayRef    = useRef<maplibregl.Marker | null>(null);

  // Ambil rute mengikuti jalan dari OSRM public server
  async function fetchOsrmRoute(pts: [number, number][]): Promise<[number, number][]> {
    // Sample max 15 titik agar tidak melebihi batas OSRM
    const MAX_WP = 15;
    const sampled: [number, number][] = pts.length <= MAX_WP
      ? pts
      : Array.from({ length: MAX_WP }, (_, i) => pts[Math.round(i * (pts.length - 1) / (MAX_WP - 1))]);

    const coordStr = sampled.map(([lon, lat]) => `${lon},${lat}`).join(';');
    try {
      const res  = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?geometries=geojson&overview=full`);
      const json = await res.json();
      if (json.code === 'Ok' && json.routes?.[0]) {
        return json.routes[0].geometry.coordinates as [number, number][];
      }
    } catch {
      console.warn('[HistoryMap] OSRM gagal, fallback ke garis lurus');
    }
    return pts; // fallback: garis lurus jika OSRM tidak respon
  }

  // Init map + polyline + start/end markers + alert pins
  useEffect(() => {
    if (!containerRef.current || track.length === 0) return;

    const rawCoords = track.map(p => [p.longitude, p.latitude] as [number, number]);
    const coords = rawCoords; // akan diganti OSRM setelah map load
    const first  = rawCoords[0];
    const last   = rawCoords[rawCoords.length - 1];

    const lngs = coords.map(c => c[0]);
    const lats  = coords.map(c => c[1]);
    const pad  = 0.01;
    const bounds: maplibregl.LngLatBoundsLike = [
      [Math.min(...lngs) - pad, Math.min(...lats) - pad],
      [Math.max(...lngs) + pad, Math.max(...lats) + pad],
    ];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
        layers:  [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      bounds,
      fitBoundsOptions: { padding: 60 },
    });

    map.on('load', async () => {
      // Mulai dengan garis lurus dulu, lalu ganti dengan OSRM
      const osrmCoords = await fetchOsrmRoute(coords);

      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: osrmCoords } },
      });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.65 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
      map.addLayer({ id: 'route-line',   type: 'line', source: 'route', paint: { 'line-color': '#16a34a', 'line-width': 4, 'line-opacity': 0.95 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
    });

    // Marker A — awal
    const startEl = document.createElement('div');
    startEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#16a34a;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.22);font-size:12px;font-weight:700;color:#fff;font-family:'Space Mono',monospace;cursor:pointer;">A</div>`;
    new maplibregl.Marker({ element: startEl })
      .setLngLat(first)
      .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '200px' })
        .setHTML(`<div style="font-size:12px;font-family:'DM Sans',sans-serif;padding:2px 0"><strong style="color:#16a34a">Titik Keberangkatan</strong><br/><span style="color:#6b7280">${new Date(track[0].timestamp).toLocaleString('id-ID')}</span></div>`))
      .addTo(map);

    // Marker B — akhir
    const endEl = document.createElement('div');
    endEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#111827;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.22);font-size:12px;font-weight:700;color:#fff;font-family:'Space Mono',monospace;cursor:pointer;">B</div>`;
    new maplibregl.Marker({ element: endEl })
      .setLngLat(last)
      .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '200px' })
        .setHTML(`<div style="font-size:12px;font-family:'DM Sans',sans-serif;padding:2px 0"><strong style="color:#111827">Titik Kedatangan</strong><br/><span style="color:#6b7280">${new Date(track[track.length - 1].timestamp).toLocaleString('id-ID')}</span></div>`))
      .addTo(map);

    // Alert pins — marker merah di posisi paket hilang
    for (const pin of alertPins) {
      if (!pin.lat || !pin.lon) continue;
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:30px;height:30px;border-radius:50%;background:#dc2626;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(220,38,38,0.4);cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>`;
      new maplibregl.Marker({ element: el })
        .setLngLat([pin.lon, pin.lat])
        .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '220px' })
          .setHTML(`<div style="font-size:12px;font-family:'DM Sans',sans-serif;padding:2px 0"><strong style="color:#dc2626">⚠ Paket Hilang</strong><br/><span style="color:#374151;font-weight:600">${pin.kode_paket}</span><br/><span style="color:#6b7280">${new Date(pin.timestamp).toLocaleString('id-ID')}</span></div>`))
        .addTo(map);
    }

    // Replay marker — truk animasi (posisi awal = titik pertama)
    const rEl = document.createElement('div');
    rEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#fff;border:2.5px solid #16a34a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(22,163,74,0.35);">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    </div>`;
    const replayMarker = new maplibregl.Marker({ element: rEl })
      .setLngLat(first)
      .addTo(map);
    // Sembunyikan dulu sampai replay dimulai
    rEl.style.display = 'none';
    replayRef.current = replayMarker;

    mapRef.current = map;

    // Sesuaikan ukuran peta saat container reflow (rotasi layar, layout
    // stack→row di breakpoint) — tidak hanya saat window resize.
    const ro = new ResizeObserver(() => map.resize());
    if (containerRef.current) ro.observe(containerRef.current);

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; replayRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update posisi replay marker saat replayIndex berubah
  useEffect(() => {
    const marker = replayRef.current;
    const map    = mapRef.current;
    if (!marker || !map || track.length === 0) return;

    const el = marker.getElement();

    if (replayIndex === undefined) {
      el.style.display = 'none';
      return;
    }

    const idx = Math.max(0, Math.min(replayIndex, track.length - 1));
    const pt  = track[idx];
    el.style.display = 'block';
    marker.setLngLat([pt.longitude, pt.latitude]);
    map.panTo([pt.longitude, pt.latitude], { duration: 200 });
  }, [replayIndex, track]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
