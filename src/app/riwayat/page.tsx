'use client';

// src/app/riwayat/page.tsx
// Log perjalanan selesai + status akhir (admin)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tripAPI, type TripItem } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

type PeriodKey = 'all' | '7d' | '30d' | '3m' | '1y';

// days=null berarti tanpa batas waktu (semua)
const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: 'all', label: 'Semua waktu', days: null },
  { key: '7d', label: '7 hari terakhir', days: 7 },
  { key: '30d', label: '30 hari terakhir', days: 30 },
  { key: '3m', label: '3 bulan terakhir', days: 90 },
  { key: '1y', label: '1 tahun terakhir', days: 365 },
];

export default function RiwayatPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('all');

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }
    tripAPI.list()
      .then(res => setTrips(res.data.filter(t => t.status_trip === 'selesai')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  // Batas waktu berdasarkan periode terpilih (difilter dari waktu_selesai)
  const cutoff = (() => {
    const days = PERIOD_OPTIONS.find(p => p.key === period)?.days;
    if (!days) return null;
    return Date.now() - days * 86400000;
  })();

  const filtered = trips.filter(t => {
    const cocokTeks =
      t.kode_truk.toLowerCase().includes(search.toLowerCase()) ||
      t.nama_driver.toLowerCase().includes(search.toLowerCase()) ||
      t.rute_asal.toLowerCase().includes(search.toLowerCase()) ||
      t.rute_tujuan.toLowerCase().includes(search.toLowerCase());
    if (!cocokTeks) return false;
    if (cutoff === null) return true;
    if (!t.waktu_selesai) return false;
    return new Date(t.waktu_selesai).getTime() >= cutoff;
  });

  function durasi(berangkat: string | null, selesai: string | null): string {
    if (!berangkat || !selesai) return '-';
    const diff = new Date(selesai).getTime() - new Date(berangkat).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}j ${m}m`;
  }

  return (
    <AdminLayout title="Riwayat Perjalanan">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Perjalanan Selesai</h2>
              <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                {filtered.length === trips.length
                  ? `${trips.length} perjalanan tercatat`
                  : `${filtered.length} dari ${trips.length} perjalanan`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select value={period} onChange={e => setPeriod(e.target.value as PeriodKey)}
                className="px-3 py-2 rounded-lg text-sm outline-none w-full sm:w-44 shrink-0 cursor-pointer"
                style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#111827' }}
                onFocus={e => { e.target.style.borderColor = '#16a34a'; }}
                onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
              >
                {PERIOD_OPTIONS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari truk, driver, rute..."
                className="px-3 py-2 rounded-lg text-sm outline-none w-full sm:w-56 shrink-0"
                style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#111827' }}
                onFocus={e => { e.target.style.borderColor = '#16a34a'; }}
                onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-sm" style={{ color: '#9ca3af' }}>
              {trips.length === 0 ? 'Belum ada perjalanan selesai.' : 'Tidak ada perjalanan yang cocok dengan filter.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(t => (
                <div key={t.id} className="rounded-xl p-4 sm:p-5" style={{ background: '#ffffff', border: '1px solid #d1fae5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{t.kode_truk}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ fontFamily: "'Space Mono', monospace", background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>#{t.id}</span>
                        </div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{t.rute_asal} → {t.rute_tujuan}</div>
                      </div>
                    </div>
                    <Link href={`/riwayat/${t.id}`} className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0" style={{ color: '#16a34a', border: '1px solid #d1fae5', textDecoration: 'none', background: '#f0fdf4' }}>
                      Detail
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 text-xs" style={{ color: '#6b7280' }}>
                    <div><div style={{ color: '#9ca3af', marginBottom: 2 }}>Driver</div><span style={{ color: '#111827', fontWeight: 500 }}>{t.nama_driver}</span></div>
                    <div><div style={{ color: '#9ca3af', marginBottom: 2 }}>Paket</div><span style={{ color: '#111827', fontWeight: 500 }}>{t.jumlah_paket}</span></div>
                    <div><div style={{ color: '#9ca3af', marginBottom: 2 }}>Durasi</div><span style={{ color: '#111827', fontWeight: 500 }}>{durasi(t.waktu_berangkat, t.waktu_selesai)}</span></div>
                    <div><div style={{ color: '#9ca3af', marginBottom: 2 }}>Selesai</div><span style={{ color: '#111827', fontWeight: 500 }}>{t.waktu_selesai ? new Date(t.waktu_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
    </AdminLayout>
  );
}
