'use client';

// src/app/armada/[trip_id]/page.tsx
// Detail muatan satu truk — indikator Ck, list paket, alert aktif

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { armadaAPI, type ArmadaDetail, type PackageItem } from '@/lib/api';
import { subscribeTrip, type TelemetryUpdatePayload, type PaketHilangPayload } from '@/lib/socket';
import AdminLayout from '@/components/layout/AdminLayout';

export default function ArmadaDetailPage() {
  const { trip_id } = useParams<{ trip_id: string }>();
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import('maplibre-gl').Map | null>(null);
  const markerRef = useRef<import('maplibre-gl').Marker | null>(null);

  const [data, setData] = useState<ArmadaDetail | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }
    armadaAPI.detail(Number(trip_id))
      .then(res => { setData(res.data); setPackages(res.data.packages); })
      .catch(() => router.replace('/armada'))
      .finally(() => setLoading(false));
  }, [trip_id, router]);

  // MapLibre
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !data?.latitude) return;
    import('maplibre-gl').then(maplibregl => {
      const map = new maplibregl.Map({
        container: mapRef.current!,
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] },
        center: [data.longitude!, data.latitude!],
        zoom: 13,
      });
      mapInstance.current = map;
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;border:2px solid #16a34a;background:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`;
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([data.longitude!, data.latitude!]).addTo(map);
    });
  }, [data]);

  // Sesuaikan ukuran peta saat container reflow (rotasi layar / breakpoint
  // stack→row), bukan hanya saat window resize.
  useEffect(() => {
    if (!mapRef.current) return;
    const ro = new ResizeObserver(() => mapInstance.current?.resize());
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);

  // WebSocket
  useEffect(() => {
    if (!trip_id) return;
    const cleanup = subscribeTrip(
      Number(trip_id),
      (payload: TelemetryUpdatePayload) => {
        setLastUpdate(payload.timestamp);
        setData(prev => prev ? { ...prev, completeness_pct: payload.completeness_pct, latitude: payload.gps.lat, longitude: payload.gps.lon, ringkasan: { ...prev.ringkasan, terdeteksi: payload.terdeteksi, total_paket: payload.total_paket } } : prev);
        if (markerRef.current) markerRef.current.setLngLat([payload.gps.lon, payload.gps.lat]);
        if (mapInstance.current) mapInstance.current.panTo([payload.gps.lon, payload.gps.lat]);
      },
      (payload: PaketHilangPayload) => {
        setData(prev => {
          if (!prev) return prev;
          const newAlert = { id: payload.alert.id, jenis_alert: payload.alert.jenis_alert, deskripsi: payload.alert.deskripsi, status_alert: 'baru', timestamp: payload.alert.timestamp, kode_paket: payload.alert.kode_paket ?? '' };
          return { ...prev, alerts_aktif: [newAlert, ...prev.alerts_aktif] };
        });
        setPackages(prev => prev.map(p => p.kode_paket === payload.alert.kode_paket ? { ...p, is_detected: false } : p));
      },
    );
    return cleanup;
  }, [trip_id]);

  const filtered = packages.filter(p =>
    p.kode_paket.toLowerCase().includes(search.toLowerCase()) ||
    p.nama_penerima.toLowerCase().includes(search.toLowerCase())
  );

  const ck = data?.completeness_pct ?? 100;
  const warn = ck < 100;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
    </div>
  );

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-3 sm:gap-4 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/armada" className="flex items-center gap-1.5 font-medium shrink-0" style={{ color: '#6b7280', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Armada
          </Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{data?.kode_truk}</span>
        </span>
      }
      topbarRight={lastUpdate ? <span className="text-xs shrink-0 hidden sm:inline" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>Update {new Date(lastUpdate).toLocaleTimeString('id-ID')}</span> : undefined}
      contentClassName="flex-1 flex flex-col lg:flex-row lg:overflow-hidden"
    >
        {/* Kiri: info + paket */}
        <div className="order-2 lg:order-1 w-full lg:w-96 flex flex-col lg:overflow-y-auto shrink-0" style={{ background: '#ffffff', borderRight: '1px solid #d1fae5' }}>
          {/* Completeness indicator */}
          <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Integritas muatan</span>
              <span className="text-2xl font-bold" style={{ fontFamily: "'Space Mono', monospace", color: warn ? '#d97706' : '#16a34a' }}>
                {data?.ringkasan.terdeteksi}/{data?.ringkasan.total_paket}
                {warn && ' ⚠'}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: '#f3f4f6' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ck}%`, background: warn ? '#d97706' : '#16a34a' }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { val: data?.ringkasan.total_paket, label: 'Total', color: '#111827' },
                { val: data?.ringkasan.terdeteksi, label: 'Terdeteksi', color: '#16a34a' },
                { val: data?.ringkasan.hilang, label: 'Tidak terdeteksi', color: '#dc2626' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                  <div className="font-bold text-base" style={{ color: s.color }}>{s.val}</div>
                  <div style={{ color: '#6b7280' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trip info */}
          <div className="p-5 text-xs space-y-2" style={{ borderBottom: '1px solid #f0fdf4', color: '#6b7280' }}>
            {[
              { label: 'Driver', val: data?.nama_driver },
              { label: 'Manifest', val: data?.kode_manifest },
              { label: 'Rute', val: `${data?.rute_asal} → ${data?.rute_tujuan}` },
              { label: 'Berangkat', val: data?.waktu_berangkat ? new Date(data.waktu_berangkat).toLocaleString('id-ID') : '-' },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span>{r.label}</span><span style={{ color: '#111827', fontWeight: 500 }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {data?.alerts_aktif && data.alerts_aktif.length > 0 && (
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#dc2626' }}>Alert aktif</div>
              <div className="space-y-2">
                {data.alerts_aktif.map(a => (
                  <div key={a.id} className="p-2.5 text-xs rounded-lg" style={{ background: '#fef2f2', borderLeft: '2px solid #dc2626' }}>
                    <div style={{ color: '#dc2626', fontWeight: 500 }}>{a.kode_paket} — {a.jenis_alert}</div>
                    <div className="mt-0.5" style={{ color: '#9ca3af' }}>{new Date(a.timestamp).toLocaleString('id-ID')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search paket */}
          <div className="p-5 pb-0">
            <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Daftar paket ({filtered.length})</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode atau penerima..."
              className="w-full px-3 py-2.5 rounded-lg text-xs outline-none mb-3"
              style={{ background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827' }}
              onFocus={e => { e.target.style.borderColor = '#16a34a'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
            />
          </div>

          {/* Package list */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-1.5">
            {filtered.map(p => (
              <Link key={p.id} href={`/armada/${trip_id}/paket/${p.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg text-xs transition-all"
                style={{ background: p.is_detected === false ? '#fef2f2' : '#f9fafb', border: `1px solid ${p.is_detected === false ? '#fecaca' : '#e5e7eb'}`, textDecoration: 'none', display: 'flex', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = p.is_detected === false ? '#f87171' : '#16a34a'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = p.is_detected === false ? '#fecaca' : '#e5e7eb'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div>
                  <div className="font-medium" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{p.kode_paket}</div>
                  <div className="mt-0.5" style={{ color: '#6b7280' }}>{p.nama_penerima}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.is_detected === false ? '#dc2626' : p.is_detected === true ? '#16a34a' : '#d1d5db' }} />
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Kanan: peta */}
        <div className="order-1 lg:order-2 lg:flex-1 relative h-[55vh] lg:h-auto min-h-64 shrink-0" style={{ background: '#e8f5e9' }}>
          <div ref={mapRef} className="absolute inset-0" />
          {!data?.latitude && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.3)" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span className="text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>Menunggu sinyal GPS...</span>
            </div>
          )}
        </div>
    </AdminLayout>
  );
}
