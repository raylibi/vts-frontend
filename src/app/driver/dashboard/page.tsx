'use client';

// src/app/driver/dashboard/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tripAPI, armadaAPI, type TripItem } from '@/lib/api';
import { subscribeTrip, destroySocket, type TelemetryUpdatePayload, type PaketHilangPayload, type PaketDitemukanPayload } from '@/lib/socket';

interface PackageStatus {
  kode_paket: string;
  nama_penerima: string;
  is_detected: boolean | null;
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<import('maplibre-gl').Map | null>(null);
  const markerRef = useRef<import('maplibre-gl').Marker | null>(null);
  const pendingPos = useRef<[number, number] | null>(null);

  const [user, setUser]             = useState<{ nama: string }>({ nama: '' });
  const [trip, setTrip]             = useState<TripItem | null>(null);
  const [packages, setPackages]     = useState<PackageStatus[]>([]);
  const [ck, setCk]                 = useState<number>(100);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Tombol aksi
  const [actionLoading, setActionLoading]         = useState(false);
  const [actionError, setActionError]             = useState('');
  const [showArriveConfirm, setShowArriveConfirm] = useState(false);
  const [finished, setFinished]                   = useState(false);

  // ── Auth + fetch trip ──────────────────────────────────────────────────────
  useEffect(() => {
    const token    = localStorage.getItem('vts_token');
    const userData = localStorage.getItem('vts_user');
    if (!token || !userData) { router.replace('/login'); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role === 'admin') { router.replace('/dashboard'); return; }
    setUser(parsed);

    tripAPI.list()
      .then(res => {
        // Ambil trip yang masih aktif (persiapan atau sedang berjalan)
        const active = res.data.find(
          t => t.status_trip === 'persiapan' || t.status_trip === 'berjalan'
        );
        setTrip(active ?? null);
        if (!active) setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  // ── Fetch detail paket (hanya saat berjalan) ───────────────────────────────
  useEffect(() => {
    if (!trip) return;
    if (trip.status_trip === 'persiapan') {
      setLoading(false);
      return;
    }
    armadaAPI.detail(trip.id)
      .then(res => {
        setCk(res.data.completeness_pct ?? 100);
        setPackages(res.data.packages.map(p => ({
          kode_paket:    p.kode_paket,
          nama_penerima: p.nama_penerima,
          is_detected:   p.is_detected,
        })));
      })
      .finally(() => setLoading(false));
  }, [trip]);

  // ── MapLibre — init saat berjalan ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current || trip?.status_trip !== 'berjalan') return;
    import('maplibre-gl').then(gl => {
      if (!mapRef.current) return;
      const center: [number, number] = pendingPos.current ?? [107.6191, -6.9175];
      const map = new gl.Map({
        container: mapRef.current,
        style: {
          version: 8,
          sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
          layers:  [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center,
        zoom: 13,
      });
      mapInst.current = map;

      const el = document.createElement('div');
      el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;border:2px solid #16a34a;background:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 5v4h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>`;
      markerRef.current = new gl.Marker({ element: el }).setLngLat(center).addTo(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.status_trip]);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!trip || trip.status_trip !== 'berjalan') return;
    const cleanup = subscribeTrip(
      trip.id,
      (payload: TelemetryUpdatePayload) => {
        setLastUpdate(payload.timestamp);
        setCk(payload.completeness_pct);
        // gps null (belum fix) → Ck tetap update, peta tunggu koordinat berikutnya
        if (!payload.gps) return;
        const lngLat: [number, number] = [payload.gps.lon, payload.gps.lat];
        pendingPos.current = lngLat;
        if (markerRef.current) markerRef.current.setLngLat(lngLat);
        if (mapInst.current)   mapInst.current.flyTo({ center: lngLat, zoom: 14, duration: 800 });
      },
      (payload: PaketHilangPayload) => {
        setPackages(prev =>
          prev.map(p => p.kode_paket === payload.alert.kode_paket ? { ...p, is_detected: false } : p)
        );
      },
      (payload: PaketDitemukanPayload) => {
        setPackages(prev =>
          prev.map(p => p.kode_paket === payload.kode_paket ? { ...p, is_detected: true } : p)
        );
      },
    );
    return cleanup;
  }, [trip]);

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleBerangkat = async () => {
    if (!trip) return;
    setActionError('');
    setActionLoading(true);
    try {
      const res = await tripAPI.start(trip.id);
      setTrip(res.data);         // status_trip sekarang 'berjalan'
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal memulai perjalanan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSampai = async () => {
    if (!trip) return;
    setActionError('');
    setActionLoading(true);
    try {
      await tripAPI.finish(trip.id);
      destroySocket();
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
      setShowArriveConfirm(false);
      setFinished(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal menyelesaikan perjalanan.');
      setShowArriveConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    destroySocket();
    localStorage.removeItem('vts_token');
    localStorage.removeItem('vts_user');
    document.cookie = 'vts_token=; path=/; max-age=0';
    router.push('/login');
  };

  const handleBack = () => {
    setFinished(false);
    setTrip(null);
    setPackages([]);
    setCk(100);
  };

  const warn       = ck < 100;
  const terdeteksi = packages.filter(p => p.is_detected !== false).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf4', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: '#ffffff', borderBottom: '1px solid #d1fae5' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#16a34a' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
              <path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#111827' }}>VTS Logistik</div>
            <div className="text-xs font-medium" style={{ color: '#16a34a', fontFamily: "'Space Mono', monospace" }}>
              DRIVER · {user.nama}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>
              {new Date(lastUpdate).toLocaleTimeString('id-ID')}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ color: '#6b7280', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>

      ) : finished ? (
        /* ── Layar selesai ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold" style={{ color: '#111827' }}>Perjalanan selesai!</div>
            <div className="text-sm mt-1" style={{ color: '#6b7280' }}>Terima kasih. Data telah tercatat.</div>
          </div>
          <button
            onClick={handleBack}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: '#16a34a', color: '#ffffff', border: 'none', cursor: 'pointer' }}
          >
            Kembali
          </button>
        </div>

      ) : !trip ? (
        /* ── Tidak ada trip ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.3)" strokeWidth="1.5">
            <rect x="1" y="3" width="15" height="13" rx="1"/>
            <path d="M16 8h4l3 5v4h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Tidak ada trip yang ditugaskan saat ini.</p>
        </div>

      ) : trip.status_trip === 'persiapan' ? (
        /* ── Layar persiapan / belum berangkat ── */
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm flex flex-col gap-5">

            {/* Badge status */}
            <div className="flex justify-center">
              <span className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-widest"
                style={{ fontFamily: "'Space Mono', monospace", background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                Menunggu Keberangkatan
              </span>
            </div>

            {/* Info trip */}
            <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: '#ffffff', border: '1px solid #d1fae5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                Detail Trip
              </div>
              {[
                { label: 'Truk',         val: `${trip.kode_truk} · ${trip.nomor_polisi}` },
                { label: 'Rute',         val: `${trip.rute_asal} → ${trip.rute_tujuan}` },
                { label: 'Manifest',     val: trip.kode_manifest },
                { label: 'Jumlah paket', val: `${trip.jumlah_paket} paket` },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm" style={{ borderBottom: '1px solid #f0fdf4', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>{r.label}</span>
                  <span style={{ color: '#111827', fontWeight: 500 }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Instruksi */}
            <div className="rounded-xl p-4 text-sm" style={{ background: '#f0fdf4', border: '1px solid #d1fae5', color: '#15803d' }}>
              Pastikan semua paket sudah dimuat ke truk sebelum menekan tombol <strong>Berangkat</strong>.
              RFID akan mulai memantau paket secara otomatis.
            </div>

            {/* Error */}
            {actionError && (
              <div className="rounded-lg p-3 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                {actionError}
              </div>
            )}

            {/* Tombol Berangkat */}
            <button
              onClick={handleBerangkat}
              disabled={actionLoading}
              className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-opacity"
              style={{
                background: actionLoading ? 'rgba(22,163,74,0.6)' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
              }}
            >
              {actionLoading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              {actionLoading ? 'Memproses...' : 'Berangkat'}
            </button>
          </div>
        </div>

      ) : (
        /* ── Layar berjalan ── */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Panel kiri */}
          <div className="w-full lg:w-80 flex flex-col overflow-y-auto shrink-0" style={{ background: '#ffffff', borderRight: '1px solid #d1fae5' }}>

            {/* Status muatan */}
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                Status muatan
              </div>
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Space Mono', monospace", color: warn ? '#d97706' : '#16a34a' }}>
                {terdeteksi}/{packages.length}
                {warn && ' ⚠'}
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#f3f4f6' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ck}%`, background: warn ? '#d97706' : '#16a34a' }} />
              </div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{Math.round(ck)}% paket terdeteksi</div>
            </div>

            {/* Trip info */}
            <div className="p-5 text-xs space-y-2" style={{ borderBottom: '1px solid #f0fdf4', color: '#6b7280' }}>
              {[
                { label: 'Truk',      val: trip.kode_truk },
                { label: 'Rute',      val: `${trip.rute_asal} → ${trip.rute_tujuan}` },
                { label: 'Manifest',  val: trip.kode_manifest },
                { label: 'Berangkat', val: trip.waktu_berangkat ? new Date(trip.waktu_berangkat).toLocaleString('id-ID') : '-' },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span>{r.label}</span>
                  <span style={{ color: '#111827', fontWeight: 500 }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Daftar paket */}
            <div className="p-5 flex-1">
              <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                Daftar paket ({packages.length})
              </div>
              <div className="space-y-1.5">
                {packages.map(p => (
                  <div
                    key={p.kode_paket}
                    className="flex items-center justify-between p-2.5 rounded-lg text-xs"
                    style={{
                      background: p.is_detected === false ? '#fef2f2' : '#f9fafb',
                      border: `1px solid ${p.is_detected === false ? '#fecaca' : '#e5e7eb'}`,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", color: '#111827', fontWeight: 500 }}>{p.kode_paket}</div>
                      <div className="mt-0.5" style={{ color: '#6b7280' }}>{p.nama_penerima}</div>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: p.is_detected === false ? '#dc2626' : p.is_detected === true ? '#16a34a' : '#d1d5db' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tombol Sampai */}
            <div className="p-5 shrink-0" style={{ borderTop: '1px solid #f0fdf4' }}>
              {actionError && (
                <div className="mb-3 rounded-lg p-2.5 text-xs" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  {actionError}
                </div>
              )}
              <button
                onClick={() => setShowArriveConfirm(true)}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: '#111827',
                  color: '#ffffff',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Sampai di Tujuan
              </button>
            </div>
          </div>

          {/* Peta */}
          <div className="flex-1 relative min-h-64" style={{ background: '#e8f5e9' }}>
            <div ref={mapRef} className="absolute inset-0" />
          </div>
        </div>
      )}

      {/* ── Modal konfirmasi Sampai ── */}
      {showArriveConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !actionLoading && setShowArriveConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </div>

            <div className="text-center">
              <div className="text-base font-semibold" style={{ color: '#111827' }}>Konfirmasi Kedatangan</div>
              <div className="text-sm mt-1" style={{ color: '#6b7280' }}>
                Apakah kamu sudah tiba di <strong>{trip?.rute_tujuan}</strong>?
                Perjalanan akan ditandai selesai dan pemantauan RFID dihentikan.
              </div>
            </div>

            {/* Ringkasan muatan */}
            <div className="rounded-xl p-3 text-sm flex justify-between" style={{ background: warn ? '#fffbeb' : '#f0fdf4', border: `1px solid ${warn ? '#fde68a' : '#d1fae5'}` }}>
              <span style={{ color: '#6b7280' }}>Paket terdeteksi</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: warn ? '#d97706' : '#16a34a' }}>
                {terdeteksi}/{packages.length}
              </span>
            </div>

            {warn && (
              <div className="rounded-lg p-3 text-xs" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                Peringatan: {packages.length - terdeteksi} paket tidak terdeteksi. Pastikan kondisi muatan sudah diperiksa.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowArriveConfirm(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={handleSampai}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  background: actionLoading ? 'rgba(22,163,74,0.6)' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                )}
                {actionLoading ? 'Menyimpan...' : 'Ya, Saya Sudah Tiba'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
