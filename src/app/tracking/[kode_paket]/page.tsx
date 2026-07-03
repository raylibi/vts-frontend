'use client';

// src/app/tracking/[kode_paket]/page.tsx
// Halaman tracking publik pelanggan — peta posisi truk + status RFID paket

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { trackingAPI, type TrackingResult } from '@/lib/api';
import { subscribePackage, type TelemetryUpdatePayload, type TripFinishedPayload } from '@/lib/socket';
import { createMockTrucks, startMockSimulation } from '@/lib/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const TrackingMap = dynamic(() => import('@/components/map/TrackingMap'), {
  ssr: false,
  loading: () => null,
});

function statusLabel(status: string): string {
  if (status === 'terkirim') return 'Terkirim';
  if (status === 'hilang') return 'Tidak Terkirim';
  if (status === 'dalam_perjalanan') return 'Dalam Pengiriman';
  if (status === 'pending') return 'Menunggu Pengiriman';
  return status;
}

function statusColor(status: string): string {
  if (status === 'terkirim') return '#16a34a';
  if (status === 'hilang') return '#dc2626';
  if (status === 'dalam_perjalanan') return '#d97706';
  return '#9ca3af';
}

export default function TrackingPage() {
  const { kode_paket } = useParams<{ kode_paket: string }>();
  const mockTrucksRef = useRef(USE_MOCK ? createMockTrucks() : []);

  const [data, setData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Fetch data awal
  useEffect(() => {
    if (!kode_paket) return;
    trackingAPI.getByKode(kode_paket)
      .then(res => setData(res.data))
      .catch(() => setError('Paket tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [kode_paket]);

  // Real-time update — re-fetch data lengkap saat ada update MQTT
  useEffect(() => {
    if (!kode_paket) return;

    if (USE_MOCK) {
      const stop = startMockSimulation(mockTrucksRef.current, (payload) => {
        setData(prev => {
          if (!prev || prev.kendaraan?.kode_truk !== payload.kode_truk) return prev;
          if (prev.status_rfid?.terdeteksi === false) return prev;
          return {
            ...prev,
            posisi_kendaraan: prev.posisi_kendaraan
              ? { ...prev.posisi_kendaraan, latitude: payload.gps.lat, longitude: payload.gps.lon, kecepatan_kmh: payload.kecepatan_kmh, timestamp: payload.timestamp }
              : null,
          };
        });
        setLastUpdate(payload.timestamp);
      });
      return stop;
    }

    // Re-fetch data lengkap dari API saat ada update telemetry.
    // Ini memastikan status_rfid, status_paket, dll selalu akurat tanpa freeze.
    const refetch = () => trackingAPI.getByKode(kode_paket).then(res => setData(res.data)).catch(() => {});

    const cleanup = subscribePackage(
      kode_paket,
      (_payload: TelemetryUpdatePayload) => {
        setLastUpdate(new Date().toISOString());
        refetch();
      },
      (_payload: TripFinishedPayload) => {
        // Trip selesai — re-fetch agar status berubah ke terkirim/hilang
        refetch();
      },
    );
    return cleanup;
  }, [kode_paket]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
      <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#f0fdf4', color: '#111827' }}>
      <p style={{ color: '#dc2626' }}>{error || 'Data tidak ditemukan.'}</p>
      <Link href="/" className="text-sm underline" style={{ color: '#16a34a' }}>← Kembali</Link>
    </div>
  );

  const isLost = data.status_rfid?.terdeteksi === false;
  const isDelivered = !data.sedang_dalam_perjalanan && data.perjalanan_selesai;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf4', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-4" style={{ background: '#ffffff', borderBottom: '1px solid #d1fae5' }}>
        <Link href="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: '#6b7280', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Kembali
        </Link>
        <span className="text-xs font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
          TRACKING · {kode_paket}
        </span>
        {lastUpdate && (
          <span className="text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>
            Update {new Date(lastUpdate).toLocaleTimeString('id-ID')}
          </span>
        )}
      </header>

      {/* Alert banner — paket tidak terdeteksi saat perjalanan aktif */}
      {isLost && data.sedang_dalam_perjalanan && (
        <div className="flex items-start gap-3 px-5 py-3 text-xs" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>
            <strong>Paket tidak terdeteksi oleh RFID reader.</strong>{' '}
            Peta menampilkan <strong>lokasi terakhir diketahui</strong> berdasarkan posisi kendaraan
            {data.status_rfid?.waktu ? ` pada ${new Date(data.status_rfid.waktu).toLocaleString('id-ID')}` : ''}.
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Peta */}
        <div className="flex-1 relative" style={{ background: '#e8f5e9', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>
          {data.posisi_kendaraan ? (
            <TrackingMap lat={data.posisi_kendaraan.latitude} lon={data.posisi_kendaraan.longitude} isLost={isLost} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.3)" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span className="text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>
                {isDelivered ? 'Pengiriman selesai' : 'Posisi belum tersedia'}
              </span>
            </div>
          )}
          {/* Label overlay */}
          {data.posisi_kendaraan && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #d1fae5', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10 }}>
              <div className="w-2 h-2 rounded-full" style={{ background: isLost ? '#dc2626' : '#16a34a' }} />
              <span style={{ color: '#374151', fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                {isLost ? 'Lokasi terakhir diketahui' : 'Posisi kendaraan saat ini'}
              </span>
              {data.posisi_kendaraan.timestamp && (
                <span style={{ color: '#9ca3af' }}>· {new Date(data.posisi_kendaraan.timestamp).toLocaleTimeString('id-ID')}</span>
              )}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="w-full md:w-80 flex flex-col overflow-y-auto" style={{ background: '#ffffff', borderLeft: '1px solid #d1fae5' }}>
          {/* Status paket */}
          <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
            <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Status paket</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#111827' }}>{data.kode_paket}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Kepada: {data.nama_penerima}</div>
              </div>
            </div>
            <div className="text-xs mb-1 font-medium" style={{ color: '#9ca3af' }}>Tujuan</div>
            <div className="text-sm mb-4" style={{ color: '#111827' }}>{data.alamat_tujuan}</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: statusColor(data.status_paket) }} />
              <span className="text-sm font-semibold" style={{ color: statusColor(data.status_paket) }}>
                {statusLabel(data.status_paket)}
              </span>
            </div>
          </div>

          {/* Info kendaraan — hanya saat perjalanan aktif */}
          {data.sedang_dalam_perjalanan && data.kendaraan && (
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Kendaraan pengiriman</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#6b7280' }}>ID Truk</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", color: '#111827', fontWeight: 600 }}>{data.kendaraan.kode_truk}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#6b7280' }}>Polisi</span>
                  <span style={{ color: '#111827', fontWeight: 500 }}>{data.kendaraan.nomor_polisi}</span>
                </div>
                {data.rute && (
                  <div className="flex justify-between">
                    <span style={{ color: '#6b7280' }}>Rute</span>
                    <span style={{ color: '#111827', fontWeight: 500 }}>{data.rute.dari} → {data.rute.ke}</span>
                  </div>
                )}
                {data.posisi_kendaraan?.kecepatan_kmh != null && (
                  <div className="flex justify-between">
                    <span style={{ color: '#6b7280' }}>Kecepatan</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{Math.round(data.posisi_kendaraan.kecepatan_kmh)} km/h</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status RFID — hanya saat perjalanan aktif */}
          {data.sedang_dalam_perjalanan && data.status_rfid && (
            <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
              <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Status RFID terakhir</div>
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: data.status_rfid.terdeteksi ? '#f0fdf4' : '#fef2f2', border: `1px solid ${data.status_rfid.terdeteksi ? '#d1fae5' : '#fecaca'}` }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: data.status_rfid.terdeteksi ? '#16a34a' : '#dc2626' }} />
                <span className="text-sm font-medium" style={{ color: data.status_rfid.terdeteksi ? '#16a34a' : '#dc2626' }}>
                  {data.status_rfid.terdeteksi ? 'Terdeteksi dalam truk' : 'Tidak terdeteksi'}
                </span>
              </div>
              <div className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                Dicek: {new Date(data.status_rfid.waktu).toLocaleString('id-ID')}
              </div>
            </div>
          )}

          {/* Pengiriman selesai */}
          {isDelivered && (
            <div className="p-5">
              <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Riwayat pengiriman</div>
              {data.status_paket === 'terkirim' ? (
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#16a34a' }}>Paket berhasil dikirim</div>
                    {data.waktu_selesai && (
                      <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                        {new Date(data.waktu_selesai).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                      </div>
                    )}
                    {data.rute && (
                      <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                        {data.rute.dari} → {data.rute.ke}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#dc2626' }}>Paket tidak terkirim</div>
                    <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Hubungi kurir untuk informasi lebih lanjut.</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Belum dalam perjalanan */}
          {!data.sedang_dalam_perjalanan && !isDelivered && (
            <div className="p-5">
              <div className="p-3 rounded-lg text-sm text-center" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                Paket belum dalam perjalanan aktif
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
