'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { tripAPI, type TripDetail, type TripHistory } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const HistoryMap = dynamic(() => import('@/components/map/HistoryMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#e8f5e9' }}><svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg></div>,
});

const REPLAY_SPEEDS = [1, 2, 5] as const;
type ReplaySpeed = typeof REPLAY_SPEEDS[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function durasi(a: string | null, b: string | null) {
  if (!a || !b) return '-';
  const d = new Date(b).getTime() - new Date(a).getTime();
  return `${Math.floor(d / 3600000)}j ${Math.floor((d % 3600000) / 60000)}m`;
}

function fmtDate(ts: string | null) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Detection Strip ───────────────────────────────────────────────────────────

function DetectionStrip({ events, tripStart, tripEnd }: {
  events: { is_detected: boolean; timestamp: string }[];
  tripStart: string;
  tripEnd: string;
}) {
  if (events.length === 0) return <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb' }} />;

  const total = new Date(tripEnd).getTime() - new Date(tripStart).getTime();
  if (total <= 0) return null;

  const segments: { pct: number; detected: boolean }[] = [];
  for (let i = 0; i < events.length; i++) {
    const start = new Date(events[i].timestamp).getTime();
    const end   = i + 1 < events.length
      ? new Date(events[i + 1].timestamp).getTime()
      : new Date(tripEnd).getTime();
    segments.push({ pct: Math.max(0, ((end - start) / total) * 100), detected: events[i].is_detected });
  }

  return (
    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: '#e5e7eb', display: 'flex' }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.detected ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RiwayatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [trip,    setTrip]    = useState<TripDetail | null>(null);
  const [history, setHistory] = useState<TripHistory | null>(null);
  const [loading, setLoading] = useState(true);

  // Replay state
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [replayIndex,  setReplayIndex]  = useState<number | undefined>(undefined);
  const [replaySpeed,  setReplaySpeed]  = useState<ReplaySpeed>(1);
  const [showLegend,   setShowLegend]   = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }
    Promise.all([tripAPI.getById(Number(id)), tripAPI.history(Number(id))])
      .then(([t, h]) => { setTrip(t.data); setHistory(h.data); })
      .catch(() => router.replace('/riwayat'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Replay interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;

    const track = history?.gps_track ?? [];
    if (track.length === 0) return;

    intervalRef.current = setInterval(() => {
      setReplayIndex(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= track.length - 1) { setIsPlaying(false); return track.length - 1; }
        return next;
      });
    }, Math.round(120 / replaySpeed));

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, replaySpeed, history]);

  const startReplay = () => { setReplayIndex(0); setIsPlaying(true); };
  const pauseReplay = () => setIsPlaying(false);
  const resetReplay = () => { setIsPlaying(false); setReplayIndex(undefined); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
    </div>
  );

  const track   = history?.gps_track ?? [];
  const alerts  = history?.alerts ?? [];
  const pkgDets = history?.package_detections ?? [];
  const alertPins = alerts
    .filter(a => a.alert_lat && a.alert_lon)
    .map(a => ({ lat: a.alert_lat!, lon: a.alert_lon!, kode_paket: a.kode_paket, timestamp: a.timestamp }));
  const replayPct = track.length > 1 && replayIndex !== undefined
    ? Math.round((replayIndex / (track.length - 1)) * 100) : 0;

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-2 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/riwayat" className="flex items-center gap-1.5 font-medium shrink-0" style={{ color: '#6b7280', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Riwayat
          </Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>Trip #{id}</span>
        </span>
      }
      topbarRight={
        <span className="text-xs px-2 py-1 rounded-md font-medium shrink-0" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>Selesai</span>
      }
      contentClassName="flex-1 flex flex-col lg:flex-row lg:overflow-hidden"
    >

          {/* ── Panel Kiri ────────────────────────────────────────────────────── */}
          <div className="order-2 lg:order-1 w-full lg:w-96 shrink-0 flex flex-col lg:overflow-y-auto" style={{ background: '#ffffff', borderRight: '1px solid #d1fae5' }}>

            {/* Info trip */}
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>{trip?.kode_truk}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{trip?.nomor_polisi} · {trip?.jenis_kendaraan}</div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Driver',    val: trip?.nama_driver },
                  { label: 'Manifest',  val: trip?.kode_manifest },
                  { label: 'Rute',      val: trip ? `${trip.rute_asal} → ${trip.rute_tujuan}` : '-' },
                  { label: 'Berangkat', val: fmtDate(trip?.waktu_berangkat ?? null) },
                  { label: 'Tiba',      val: fmtDate(trip?.waktu_selesai   ?? null) },
                  { label: 'Durasi',    val: durasi(trip?.waktu_berangkat ?? null, trip?.waktu_selesai ?? null) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span style={{ color: '#9ca3af' }}>{r.label}</span>
                    <span className="font-medium text-right" style={{ color: '#111827', maxWidth: 200 }}>{r.val ?? '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistik */}
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Ringkasan</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: trip?.packages.length ?? '-', label: 'Paket',    color: '#16a34a' },
                  { val: track.length,                 label: 'Titik GPS', color: '#2563eb' },
                  { val: alerts.length,                label: 'Alert',    color: alerts.length > 0 ? '#dc2626' : '#9ca3af' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div className="font-bold text-lg" style={{ fontFamily: "'Space Mono', monospace", color: s.color }}>{s.val}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection strips */}
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Status Deteksi Paket</p>
              {trip && pkgDets.length === 0 && (
                <p className="text-xs" style={{ color: '#9ca3af' }}>Tidak ada data deteksi.</p>
              )}
              <div className="space-y-3">
                {(trip?.packages ?? []).map(pkg => {
                  const det    = pkgDets.find(d => d.kode_paket === pkg.kode_paket);
                  const isLost = pkg.status_paket === 'hilang';
                  return (
                    <div key={pkg.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isLost ? '#dc2626' : '#16a34a' }} />
                          <span className="text-xs font-medium" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{pkg.kode_paket}</span>
                        </div>
                        <Link
                          href={`/riwayat/${id}/paket/${pkg.id}`}
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{
                            background: isLost ? '#fef2f2' : '#f0fdf4',
                            color: isLost ? '#dc2626' : '#16a34a',
                            border: `1px solid ${isLost ? '#fecaca' : '#bbf7d0'}`,
                            textDecoration: 'none',
                          }}
                        >
                          {isLost ? 'Lihat Jejak →' : 'Detail →'}
                        </Link>
                      </div>
                      <DetectionStrip
                        events={det?.events ?? []}
                        tripStart={trip?.waktu_berangkat ?? ''}
                        tripEnd={trip?.waktu_selesai ?? ''}
                      />
                      <div className="flex justify-between mt-1 text-xs" style={{ color: '#9ca3af' }}>
                        <span>Awal</span><span>Akhir</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legenda strip */}
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#6b7280' }}>
                <div className="flex items-center gap-1.5"><span style={{ width: 12, height: 6, borderRadius: 2, background: '#16a34a', display: 'inline-block' }} /> Terdeteksi</div>
                <div className="flex items-center gap-1.5"><span style={{ width: 12, height: 6, borderRadius: 2, background: '#dc2626', display: 'inline-block' }} /> Tidak terdeteksi</div>
              </div>
            </div>

            {/* Alert timeline */}
            {alerts.length > 0 && (
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#dc2626' }}>
                  Timeline Alert ({alerts.length})
                </p>
                <div className="relative">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px" style={{ background: '#fecaca' }} />
                  <div className="space-y-5">
                    {alerts.map((a, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 relative z-10" style={{ background: '#dc2626', border: '2px solid #fff', boxShadow: '0 0 0 1px #fecaca' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{a.kode_paket}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 10 }}>{a.jenis_alert}</span>
                          </div>
                          <div className="text-xs mb-1" style={{ color: '#374151' }}>{a.deskripsi}</div>
                          <div className="text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>{new Date(a.timestamp).toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Panel Kanan — Peta + Replay ──────────────────────────────────── */}
          <div className="order-1 lg:order-2 lg:flex-1 flex flex-col lg:overflow-hidden h-[55vh] lg:h-auto shrink-0">

            {/* Replay controls */}
            {track.length > 0 && (
              <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5" style={{ background: '#ffffff', borderBottom: '1px solid #d1fae5' }}>

                {/* Tombol kontrol */}
                <button onClick={resetReplay} title="Reset" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                </button>
                <button onClick={isPlaying ? pauseReplay : startReplay} style={{ width: 30, height: 30, borderRadius: '50%', background: '#16a34a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isPlaying
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                </button>

                {/* Progress bar */}
                <div className="flex-1 relative h-1.5 rounded-full overflow-hidden cursor-pointer" style={{ background: '#e5e7eb' }}
                  onClick={e => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const pct  = (e.clientX - rect.left) / rect.width;
                    const idx  = Math.round(pct * (track.length - 1));
                    setReplayIndex(idx);
                    setIsPlaying(false);
                  }}>
                  <div style={{ width: `${replayPct}%`, height: '100%', background: '#16a34a', transition: 'width 0.1s linear' }} />
                </div>

                {/* Timestamp */}
                <span className="text-xs shrink-0" style={{ fontFamily: "'Space Mono', monospace", color: '#6b7280', minWidth: 90 }}>
                  {replayIndex !== undefined && track[replayIndex]
                    ? new Date(track[replayIndex].timestamp).toLocaleTimeString('id-ID')
                    : '––:––:––'}
                </span>

                {/* Speed selector */}
                <div className="flex items-center gap-1">
                  {REPLAY_SPEEDS.map(s => (
                    <button key={s} onClick={() => setReplaySpeed(s)}
                      style={{ padding: '2px 7px', borderRadius: 4, border: '1px solid', fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: 'pointer', background: replaySpeed === s ? '#16a34a' : 'transparent', color: replaySpeed === s ? '#fff' : '#6b7280', borderColor: replaySpeed === s ? '#16a34a' : '#d1d5db' }}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Peta */}
            <div className="flex-1 relative" style={{ background: '#e8f5e9' }}>
              {track.length > 0 ? (
                <>
                  <HistoryMap track={track} alertPins={alertPins} replayIndex={replayIndex} />

                  {/* Badge GPS */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg z-10"
                    style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #d1fae5', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span style={{ fontFamily: "'Space Mono', monospace", color: '#374151' }}>{track.length} titik GPS</span>
                  </div>

                  {/* Legenda — bisa ditampilkan / disembunyikan lewat tombol */}
                  <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 z-10">
                    {showLegend && (
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Titik Keberangkatan', color: '#16a34a', char: 'A' },
                          { label: 'Titik Kedatangan',   color: '#111827', char: 'B' },
                        ].map(l => (
                          <div key={l.char} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #d1fae5', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: l.color, fontSize: 9, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{l.char}</div>
                            <span style={{ color: '#374151' }}>{l.label}</span>
                          </div>
                        ))}
                        {alertPins.length > 0 && (
                          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #fecaca', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#dc2626' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <span style={{ color: '#dc2626' }}>Lokasi paket hilang</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowLegend(s => !s)}
                      aria-expanded={showLegend}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #d1fae5', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#374151', cursor: 'pointer' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                      <span style={{ fontFamily: "'Space Mono', monospace" }}>{showLegend ? 'Sembunyikan legenda' : 'Legenda'}</span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showLegend ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.25)" strokeWidth="1.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <div className="text-center">
                    <div className="text-sm font-medium" style={{ color: '#6b7280' }}>Tidak ada data GPS</div>
                    <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>Rekaman jejak perjalanan tidak tersedia</div>
                  </div>
                </div>
              )}
            </div>
          </div>

    </AdminLayout>
  );
}
