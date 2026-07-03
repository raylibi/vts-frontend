'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface TracePoint {
  latitude: number;
  longitude: number;
  is_detected: boolean;
  timestamp: string;
}

interface Props {
  trace: TracePoint[];
}

function splitSegments(rawTrace: TracePoint[]) {
  const trace = rawTrace.map(p => ({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude) }));

  const segments: { coords: [number, number][]; detected: boolean }[] = [];
  if (trace.length === 0) return { segments, lastDetected: null, firstMissed: null };

  let cur: [number, number][] = [[trace[0].longitude, trace[0].latitude]];
  let isDetected = trace[0].is_detected;

  for (let i = 1; i < trace.length; i++) {
    const pt = trace[i];
    const coord: [number, number] = [pt.longitude, pt.latitude];
    if (pt.is_detected !== isDetected) {
      cur.push(coord);
      segments.push({ coords: cur, detected: isDetected });
      cur = [coord];
      isDetected = pt.is_detected;
    } else {
      cur.push(coord);
    }
  }
  segments.push({ coords: cur, detected: isDetected });

  const lastDetected = [...trace].reverse().find(p => p.is_detected) ?? null;
  const firstMissed  = trace.find(p => !p.is_detected) ?? null;

  return { segments, lastDetected, firstMissed };
}

async function fetchOsrmRoute(pts: [number, number][]): Promise<[number, number][]> {
  if (pts.length < 2) return pts;
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
    console.warn('[PackageTraceMap] OSRM gagal, fallback ke garis lurus');
  }
  return pts;
}

export default function PackageTraceMap({ trace }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || trace.length === 0) return;

    const { segments, lastDetected, firstMissed } = splitSegments(trace);

    const allCoords = trace.map(p => [Number(p.longitude), Number(p.latitude)] as [number, number]);
    const lngs = allCoords.map(c => c[0]);
    const lats  = allCoords.map(c => c[1]);
    const pad   = 0.01;
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
      // Fetch OSRM per segmen agar warna mengikuti jalur jalan
      const routed = await Promise.all(
        segments.map(seg => fetchOsrmRoute(seg.coords).then(coords => ({ coords, detected: seg.detected })))
      );

      routed.forEach((seg, i) => {
        const color  = seg.detected ? '#16a34a' : '#dc2626';
        const srcId  = `seg-${i}`;

        map.addSource(srcId, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: seg.coords } },
        });
        map.addLayer({ id: `${srcId}-casing`, type: 'line', source: srcId, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.65 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
        map.addLayer({ id: `${srcId}-line`,   type: 'line', source: srcId, paint: { 'line-color': color,     'line-width': 4, 'line-opacity': 0.95 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
      });
    });

    // Marker A — titik awal
    const startEl = document.createElement('div');
    startEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#16a34a;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.22);font-size:12px;font-weight:700;color:#fff;font-family:'Space Mono',monospace;cursor:pointer;">A</div>`;
    new maplibregl.Marker({ element: startEl })
      .setLngLat([Number(trace[0].longitude), Number(trace[0].latitude)])
      .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false })
        .setHTML(`<div style="font-size:12px;font-family:'DM Sans',sans-serif"><strong style="color:#16a34a">Awal Perjalanan</strong><br/><span style="color:#6b7280">${new Date(trace[0].timestamp).toLocaleString('id-ID')}</span></div>`))
      .addTo(map);

    // Marker terakhir terdeteksi — bintang kuning
    if (lastDetected && firstMissed) {
      const ldEl = document.createElement('div');
      ldEl.innerHTML = `<div style="width:34px;height:34px;border-radius:50%;background:#f59e0b;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(245,158,11,0.45);cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>`;
      new maplibregl.Marker({ element: ldEl })
        .setLngLat([lastDetected.longitude, lastDetected.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false })
          .setHTML(`<div style="font-size:12px;font-family:'DM Sans',sans-serif"><strong style="color:#d97706">Terakhir Terdeteksi</strong><br/><span style="color:#6b7280">${new Date(lastDetected.timestamp).toLocaleString('id-ID')}</span></div>`))
        .addTo(map);
    }

    // Marker pertama kali hilang — segitiga merah
    if (firstMissed) {
      const fmEl = document.createElement('div');
      fmEl.innerHTML = `<div style="width:34px;height:34px;border-radius:50%;background:#dc2626;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(220,38,38,0.4);cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>`;
      new maplibregl.Marker({ element: fmEl })
        .setLngLat([firstMissed.longitude, firstMissed.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false })
          .setHTML(`<div style="font-size:12px;font-family:'DM Sans',sans-serif"><strong style="color:#dc2626">Pertama Kali Hilang</strong><br/><span style="color:#6b7280">${new Date(firstMissed.timestamp).toLocaleString('id-ID')}</span></div>`))
        .addTo(map);
    }

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    if (containerRef.current) ro.observe(containerRef.current);

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
