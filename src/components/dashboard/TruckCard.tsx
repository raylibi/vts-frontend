// src/components/dashboard/TruckCard.tsx
// Card satu armada — dipakai di /armada (grid) dan panel kanan /dashboard

import Link from 'next/link';
import ProgressBar from '@/components/ui/ProgressBar';

interface TruckCardProps {
  trip_id: number;
  kode_truk: string;
  nomor_polisi?: string;
  rute_asal: string;
  rute_tujuan: string;
  nama_driver: string;
  completeness_pct: number;
  terdeteksi: number;
  total_paket: number;
  kecepatan_kmh?: number | null;
  /** Tampilkan sebagai list row (compact) bukan card grid */
  compact?: boolean;
}

export default function TruckCard({
  trip_id,
  kode_truk,
  nomor_polisi,
  rute_asal,
  rute_tujuan,
  nama_driver,
  completeness_pct,
  terdeteksi,
  total_paket,
  kecepatan_kmh,
  compact = false,
}: TruckCardProps) {
  const warn = completeness_pct < 100;
  const pct = Math.round(completeness_pct);

  if (compact) {
    // Versi compact untuk panel sidebar dashboard
    return (
      <Link
        href={`/armada/${trip_id}`}
        className="block rounded-lg p-3 transition-all"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: warn ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
          textDecoration: 'none',
        }}
      >
        <div className="flex justify-between items-center mb-1.5">
          <span
            className="text-xs font-bold"
            style={{ fontFamily: "'Space Mono', monospace", color: '#e8f0fe' }}
          >
            {kode_truk}
          </span>
          <span
            className="text-xs"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: warn ? '#f59e0b' : '#14c896',
            }}
          >
            {terdeteksi}/{total_paket}{warn ? ' ⚠' : ''}
          </span>
        </div>
        <ProgressBar pct={pct} height={3} />
        <div className="text-xs mt-1.5" style={{ color: 'rgba(200,210,230,0.4)' }}>
          {rute_asal} → {rute_tujuan}
          {kecepatan_kmh != null && ` · ${Math.round(kecepatan_kmh)} km/h`}
        </div>
      </Link>
    );
  }

  // Versi card penuh untuk /armada
  return (
    <Link
      href={`/armada/${trip_id}`}
      className="block rounded-xl p-5 transition-all"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: warn ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
        textDecoration: 'none',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div
            className="font-bold text-sm"
            style={{ fontFamily: "'Space Mono', monospace", color: '#e8f0fe' }}
          >
            {kode_truk}
          </div>
          {nomor_polisi && (
            <div className="text-xs mt-0.5" style={{ color: 'rgba(200,210,230,0.4)' }}>
              {nomor_polisi}
            </div>
          )}
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full"
          style={{
            background: warn ? 'rgba(245,158,11,0.1)' : 'rgba(20,200,160,0.1)',
            color: warn ? '#f59e0b' : '#14c896',
            border: `1px solid ${warn ? 'rgba(245,158,11,0.25)' : 'rgba(20,200,160,0.25)'}`,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          {pct}%
        </span>
      </div>

      <ProgressBar pct={pct} height={4} className="mb-4" />

      {/* Info */}
      <div className="space-y-1.5 text-xs" style={{ color: 'rgba(200,210,230,0.45)' }}>
        <div className="flex justify-between">
          <span>Driver</span>
          <span style={{ color: '#e8f0fe' }}>{nama_driver}</span>
        </div>
        <div className="flex justify-between">
          <span>Rute</span>
          <span style={{ color: '#e8f0fe' }}>{rute_asal} → {rute_tujuan}</span>
        </div>
        <div className="flex justify-between">
          <span>Paket</span>
          <span style={{ color: warn ? '#f59e0b' : '#e8f0fe' }}>
            {terdeteksi}/{total_paket}
          </span>
        </div>
        {kecepatan_kmh != null && (
          <div className="flex justify-between">
            <span>Kecepatan</span>
            <span style={{ color: '#14c896' }}>{Math.round(kecepatan_kmh)} km/h</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs flex items-center gap-1" style={{ color: 'rgba(20,200,160,0.6)' }}>
        Lihat detail
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}
