'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import type { TruckPin } from '@/components/map/DashboardMap';
import {
  createMockTrucks,
  startMockSimulation,
} from '@/lib/mockData';
import { armadaAPI } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const DashboardMap = dynamic(() => import('@/components/map/DashboardMap'), {
  ssr: false,
  loading: () => null,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface TelemetryPayload {
  trip_id: number;
  kode_truk: string;
  timestamp: string;
  // null saat GPS truk belum fix — RFID/Ck tetap terkirim tanpa koordinat
  gps: { lat: number; lon: number } | null;
  completeness_pct: number;
  terdeteksi: number;
  total_paket: number;
}

interface AlertPayload {
  trip_id: number;
  kode_truk: string;
  alert: {
    id: number;
    package_id?: number;
    jenis_alert: string;
    deskripsi: string;
    timestamp: string;
    kode_paket?: string;
  };
}

interface LiveTruck {
  trip_id: number;
  kode_truk: string;
  rute_asal: string;
  rute_tujuan: string;
  nama_driver: string;
  completeness_pct: number;
  terdeteksi: number;
  total_paket: number;
  kecepatan_kmh: number | null;
  lat: number | null;
  lon: number | null;
  last_update: string;
}

interface ActiveAlert {
  id: number;
  kode_truk: string;
  deskripsi: string;
  timestamp: string;
  kode_paket?: string;
  // Untuk link ke halaman detail paket (/armada/[trip_id]/paket/[paket_id])
  trip_id?: number;
  package_id?: number;
}

interface DeviceStatus {
  id: string;
  online: boolean;
  gps_fix: boolean | null;
  signal_csq: number | null;
  uptime_s: number | null;
  last_seen: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProgressBar({ pct, warn }: { pct: number; warn: boolean }) {
  return (
    <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(22,163,74,0.15)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: warn ? '#d97706' : '#16a34a' }}
      />
    </div>
  );
}

// Kekuatan sinyal seluler dari nilai CSQ (AT+CSQ: 0-31, 99 = tidak diketahui)
function signalLabel(csq: number): string {
  if (csq < 0 || csq === 99) return 'sinyal ?';
  if (csq >= 20) return `sinyal kuat`;
  if (csq >= 15) return `sinyal baik`;
  if (csq >= 10) return `sinyal cukup`;
  return `sinyal lemah`;
}

function toTruckPin(t: LiveTruck): TruckPin | null {
  if (t.lat === null || t.lon === null) return null;
  return { trip_id: t.trip_id, kode_truk: t.kode_truk, lat: t.lat, lon: t.lon, completeness_pct: t.completeness_pct };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const mockTrucksRef = useRef(USE_MOCK ? createMockTrucks() : []);
  // Ref untuk akses state terkini dari dalam closure socket tanpa stale capture
  const trucksRef = useRef<Map<number, LiveTruck>>(new Map());

  const [trucks, setTrucks] = useState<Map<number, LiveTruck>>(new Map());
  const [deviceStatus, setDeviceStatus] = useState<Record<string, DeviceStatus>>({});
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    const userData = localStorage.getItem('vts_user');
    if (!token || !userData) {
      router.replace('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role === 'driver') {
      router.replace('/driver/dashboard');
      return;
    }
  }, [router]);

  // ── Fetch armada awal ─────────────────────────────────────────────────────
  const fetchArmada = useCallback(async () => {
    if (USE_MOCK) {
      const map = new Map<number, LiveTruck>();
      mockTrucksRef.current.forEach(({ data: a }) => {
        map.set(a.trip_id, {
          trip_id:        a.trip_id,
          kode_truk:      a.kode_truk,
          rute_asal:      a.rute_asal,
          rute_tujuan:    a.rute_tujuan,
          nama_driver:    a.nama_driver,
          completeness_pct: a.completeness_pct,
          terdeteksi:     Math.round((a.completeness_pct / 100) * a.total_paket),
          total_paket:    a.total_paket,
          kecepatan_kmh:  a.kecepatan_kmh,
          lat:            a.latitude,
          lon:            a.longitude,
          last_update:    a.waktu_posisi,
        });
      });
      setTrucks(map);
      setLoading(false);
      return;
    }

    try {
      const data = await armadaAPI.list();
      const map = new Map<number, LiveTruck>();
      data.data.forEach((a) => {
        map.set(a.trip_id, {
          trip_id:          a.trip_id,
          kode_truk:        a.kode_truk,
          rute_asal:        a.rute_asal,
          rute_tujuan:      a.rute_tujuan,
          nama_driver:      a.nama_driver,
          completeness_pct: a.completeness_pct ?? 100,
          terdeteksi:       Math.round(((a.completeness_pct ?? 100) / 100) * Number(a.total_paket)),
          total_paket:      Number(a.total_paket),
          kecepatan_kmh:    a.kecepatan_kmh,
          lat:              a.latitude,
          lon:              a.longitude,
          last_update:      a.waktu_posisi ?? new Date().toISOString(),
        });
      });
      setTrucks(map);
    } catch (err) {
      console.error('Gagal fetch armada:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArmada();
  }, [fetchArmada]);

  // ── Fetch kondisi alat awal (online/gps/sinyal) ───────────────────────────
  useEffect(() => {
    if (USE_MOCK) return;
    armadaAPI.deviceStatus()
      .then((res) => setDeviceStatus(res.data))
      .catch((err) => console.error('Gagal fetch status alat:', err));
  }, []);

  // ── Fetch alert aktif awal — panel alert tetap terisi setelah refresh.
  // Hanya alert status 'baru'; yang sudah pulih tidak ikut. Digabung dengan
  // alert dari websocket tanpa duplikat (id sama di-skip).
  useEffect(() => {
    if (USE_MOCK) return;
    armadaAPI.activeAlerts()
      .then((res) => {
        const fetched: ActiveAlert[] = res.data.map((a) => ({
          id:         a.id,
          kode_truk:  a.kode_truk,
          deskripsi:  a.deskripsi,
          timestamp:  a.timestamp,
          kode_paket: a.kode_paket,
          trip_id:    a.trip_id,
          package_id: a.package_id,
        }));
        setAlerts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...fetched.filter((f) => !seen.has(f.id))].slice(0, 20);
        });
      })
      .catch((err) => console.error('Gagal fetch alert aktif:', err));
  }, []);

  // Jaga trucksRef selalu sinkron dengan trucks state
  useEffect(() => {
    trucksRef.current = trucks;
  }, [trucks]);

  // ── WebSocket / simulasi mock ─────────────────────────────────────────────
  useEffect(() => {
    if (USE_MOCK) {
      setWsConnected(true);
      const stop = startMockSimulation(mockTrucksRef.current, (payload) => {
        setTrucks((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.trip_id);
          if (existing) {
            next.set(payload.trip_id, {
              ...existing,
              completeness_pct: payload.completeness_pct,
              terdeteksi:       payload.terdeteksi,
              total_paket:      payload.total_paket,
              kecepatan_kmh:    payload.kecepatan_kmh,
              lat:              payload.gps.lat,
              lon:              payload.gps.lon,
              last_update:      payload.timestamp,
            });
          }
          return next;
        });
      });
      return () => { stop(); setWsConnected(false); };
    }

    const token = localStorage.getItem('vts_token');
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('telemetry_update', (payload: TelemetryPayload) => {
      // Fallback: jika trip belum ada di state (misal trip_started terlambat/terlewat),
      // re-fetch agar data muncul. trucksRef selalu terkini meski closure ini stale.
      if (!trucksRef.current.has(payload.trip_id)) {
        fetchArmada();
        return;
      }
      setTrucks((prev) => {
        const next = new Map(prev);
        const existing = next.get(payload.trip_id);
        if (!existing) return next;
        next.set(payload.trip_id, {
          ...existing,
          completeness_pct: payload.completeness_pct,
          terdeteksi:       payload.terdeteksi,
          total_paket:      payload.total_paket,
          // gps null (belum fix) → pertahankan posisi terakhir
          lat:              payload.gps ? payload.gps.lat : existing.lat,
          lon:              payload.gps ? payload.gps.lon : existing.lon,
          last_update:      payload.timestamp,
        });
        return next;
      });
    });

    socket.on('paket_hilang', (payload: AlertPayload) => {
      const newAlert: ActiveAlert = {
        id:          payload.alert.id,
        kode_truk:   payload.kode_truk,
        deskripsi:   payload.alert.deskripsi,
        timestamp:   payload.alert.timestamp,
        kode_paket:  payload.alert.kode_paket,
        trip_id:     payload.trip_id,
        package_id:  payload.alert.package_id,
      };
      setAlerts((prev) => {
        if (prev.some(a => a.id === payload.alert.id)) return prev;
        return [newAlert, ...prev].slice(0, 20);
      });
    });

    socket.on('paket_ditemukan', (payload: { alert_id: number }) => {
      setAlerts((prev) => prev.filter(a => a.id !== payload.alert_id));
    });

    socket.on('trip_started', () => {
      // Trip baru aktif — re-fetch armada agar truk muncul di dashboard
      fetchArmada();
    });

    socket.on('device_status', (payload: DeviceStatus) => {
      setDeviceStatus((prev) => ({ ...prev, [payload.id]: payload }));
    });

    socket.on('trip_finished', ({ trip_id }: { trip_id: number }) => {
      setTrucks((prev) => {
        const next = new Map(prev);
        next.delete(trip_id);
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const truckList = Array.from(trucks.values());
  const avgCk = truckList.length
    ? Math.round(truckList.reduce((s, t) => s + t.completeness_pct, 0) / truckList.length)
    : 0;
  const totalPaket = truckList.reduce((s, t) => s + t.total_paket, 0);
  const truckPins = new Map<number, TruckPin>(
    truckList.flatMap((t) => {
      const pin = toTruckPin(t);
      return pin ? [[t.trip_id, pin]] : [];
    })
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title={
        <>
          <span className="hidden sm:inline">Dashboard Monitoring</span>
          <span className="sm:hidden">Dashboard</span>
        </>
      }
      topbarRight={
        <>
          {USE_MOCK && (
            <span
              className="text-xs px-2 py-0.5 rounded shrink-0"
              style={{
                fontFamily: "'Space Mono', monospace",
                background: 'rgba(217,119,6,0.1)',
                color: '#d97706',
                border: '1px solid rgba(217,119,6,0.3)',
              }}
            >
              MOCK
            </span>
          )}
          <span
            className="text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0"
            style={{
              fontFamily: "'Space Mono', monospace",
              background: wsConnected ? '#dcfce7' : '#f3f4f6',
              color: wsConnected ? '#16a34a' : '#6b7280',
              border: `1px solid ${wsConnected ? '#bbf7d0' : '#e5e7eb'}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: wsConnected ? '#16a34a' : '#9ca3af' }}
            />
            {wsConnected ? 'Live' : 'Offline'}
          </span>

          {alerts.length > 0 && (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full shrink-0"
              style={{
                fontFamily: "'Space Mono', monospace",
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
              }}
            >
              {alerts.length} Alert
            </span>
          )}
        </>
      }
      contentClassName="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0"
    >
          {/* Peta */}
          <div
            className="relative w-full h-[45vh] lg:h-auto lg:flex-1 shrink-0"
            style={{ background: '#e8f5e9', overflow: 'hidden' }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10" style={{ pointerEvents: 'none' }}>
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span className="text-xs" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                    Memuat data armada...
                  </span>
                </div>
              </div>
            )}

            <DashboardMap trucks={truckPins} />

            <div
              className="absolute top-3 left-3 text-xs uppercase tracking-widest pointer-events-none"
              style={{ fontFamily: "'Space Mono', monospace", color: 'rgba(22,163,74,0.6)', zIndex: 10 }}
            >
              OpenStreetMap · MapLibre GL JS
            </div>
          </div>

          {/* Right panel */}
          <aside
            className="w-full lg:w-80 flex flex-col lg:overflow-hidden shrink-0"
            style={{ background: '#ffffff', borderLeft: '1px solid #d1fae5' }}
          >
            {/* Ringkasan */}
            <div className="p-4" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <div
                className="text-xs uppercase tracking-widest mb-3 font-semibold"
                style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}
              >
                Ringkasan
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: truckList.length, label: 'Truk aktif', color: '#16a34a' },
                  { val: totalPaket, label: 'Total paket', color: '#111827' },
                  { val: alerts.length, label: 'Alert baru', color: alerts.length > 0 ? '#d97706' : '#111827' },
                  { val: `${avgCk}%`, label: 'Avg. Ck', color: avgCk >= 95 ? '#16a34a' : '#d97706' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg p-3"
                    style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}
                  >
                    <div className="text-xl font-semibold leading-none" style={{ color: s.color }}>
                      {s.val}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="p-4" style={{ borderBottom: '1px solid #f0fdf4' }}>
                <div
                  className="text-xs uppercase tracking-widest mb-3 font-semibold"
                  style={{ fontFamily: "'Space Mono', monospace", color: '#dc2626' }}
                >
                  Alert aktif
                </div>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {alerts.slice(0, 5).map((a) => {
                    const href = a.trip_id != null && a.package_id != null
                      ? `/armada/${a.trip_id}/paket/${a.package_id}`
                      : null;
                    const inner = (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium" style={{ color: '#dc2626' }}>
                            {a.kode_paket ?? 'Paket'} tidak terdeteksi
                          </div>
                          {href && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
                          )}
                        </div>
                        <div className="mt-0.5" style={{ color: '#6b7280' }}>
                          {a.kode_truk} · {new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {href && (
                          <div className="mt-0.5" style={{ color: '#9ca3af' }}>
                            Klik untuk lihat penerima &amp; alamat
                          </div>
                        )}
                      </>
                    );
                    const boxStyle: React.CSSProperties = {
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderLeft: '3px solid #dc2626',
                      textDecoration: 'none',
                      display: 'block',
                    };
                    return href ? (
                      <Link
                        key={a.id}
                        href={href}
                        className="p-2.5 text-xs rounded-lg transition-all"
                        style={boxStyle}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(220,38,38,0.2)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={a.id} className="p-2.5 text-xs rounded-lg" style={boxStyle}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              className="text-xs uppercase tracking-widest px-4 py-3 font-semibold"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: '#16a34a',
                borderBottom: '1px solid #d1fae5',
              }}
            >
              Status armada
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {loading ? (
                <div className="text-xs text-center py-8" style={{ color: '#9ca3af' }}>
                  Memuat...
                </div>
              ) : truckList.length === 0 ? (
                <div className="text-xs text-center py-8" style={{ color: '#9ca3af' }}>
                  Tidak ada truk aktif
                </div>
              ) : (
                truckList.map((truck) => {
                  const warn = truck.completeness_pct < 100;
                  const pct = Math.round(truck.completeness_pct);
                  return (
                    <Link
                      key={truck.trip_id}
                      href={`/armada/${truck.trip_id}`}
                      className="block rounded-lg p-3 transition-all"
                      style={{
                        background: warn ? '#fffbeb' : '#f0fdf4',
                        border: warn ? '1px solid #fde68a' : '1px solid #d1fae5',
                        textDecoration: 'none',
                      }}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>
                          {truck.kode_truk}
                        </span>
                        <span className="text-xs" style={{ fontFamily: "'Space Mono', monospace", color: warn ? '#d97706' : '#16a34a' }}>
                          {truck.terdeteksi}/{truck.total_paket}{warn ? ' ⚠' : ''}
                        </span>
                      </div>
                      <ProgressBar pct={pct} warn={warn} />
                      <div className="text-xs mt-1.5" style={{ color: '#6b7280' }}>
                        {truck.rute_asal} → {truck.rute_tujuan}
                        {truck.kecepatan_kmh != null && ` · ${Math.round(truck.kecepatan_kmh)} km/h`}
                      </div>
                      {(() => {
                        const ds = deviceStatus[truck.kode_truk];
                        if (!ds) return null;
                        return (
                          <div
                            className="text-xs mt-1.5 flex items-center gap-2 flex-wrap"
                            style={{ fontFamily: "'Space Mono', monospace" }}
                          >
                            <span style={{ color: ds.online ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                              ● {ds.online ? 'online' : 'offline'}
                            </span>
                            {ds.online && ds.gps_fix !== null && (
                              <span style={{ color: '#6b7280' }}>
                                GPS{' '}
                                {ds.gps_fix
                                  ? <span style={{ color: '#16a34a', fontWeight: 600 }}>OK</span>
                                  : <span style={{ color: '#d97706' }}>mencari…</span>}
                              </span>
                            )}
                            {ds.online && ds.signal_csq !== null && (
                              <span style={{ color: '#6b7280' }}>
                                {signalLabel(ds.signal_csq)} ({ds.signal_csq})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </Link>
                  );
                })
              )}
            </div>
          </aside>
    </AdminLayout>
  );
}
