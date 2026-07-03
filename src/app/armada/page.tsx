'use client';

// src/app/armada/page.tsx
// List semua truk aktif + status muatan (admin)

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { armadaAPI, type ArmadaItem } from '@/lib/api';
import { connectAsAdmin, type TelemetryUpdatePayload, type PaketHilangPayload } from '@/lib/socket';
import { createMockTrucks, startMockSimulation } from '@/lib/mockData';
import AdminLayout from '@/components/layout/AdminLayout';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export default function ArmadaPage() {
  const router = useRouter();
  const mockTrucksRef = useRef(USE_MOCK ? createMockTrucks() : []);
  const [armada, setArmada] = useState<ArmadaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }
    armadaAPI.list()
      .then(res => setArmada(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (USE_MOCK) {
      const stop = startMockSimulation(mockTrucksRef.current, (payload) => {
        setArmada(prev => prev.map(a => a.trip_id === payload.trip_id
          ? { ...a, completeness_pct: payload.completeness_pct, kecepatan_kmh: payload.kecepatan_kmh }
          : a
        ));
      });
      return stop;
    }

    const cleanup = connectAsAdmin(
      (payload: TelemetryUpdatePayload) => {
        setArmada(prev => prev.map(a => a.trip_id === payload.trip_id
          ? { ...a, completeness_pct: payload.completeness_pct }
          : a
        ));
      },
      (_: PaketHilangPayload) => {},
    );
    return cleanup;
  }, []);

  return (
    <AdminLayout title="Monitor Armada">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Armada Aktif</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{armada.length} truk sedang beroperasi</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
        </div>
      ) : armada.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: '#9ca3af' }}>Tidak ada truk aktif saat ini.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {armada.map(a => {
            const ck = a.completeness_pct ?? 100;
            const warn = ck < 100;
            return (
              <Link key={a.trip_id} href={`/armada/${a.trip_id}`} className="block rounded-xl p-5 transition-all" style={{ background: '#ffffff', border: warn ? '1px solid #fde68a' : '1px solid #d1fae5', textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-sm" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{a.kode_truk}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{a.nomor_polisi}</div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: warn ? '#fffbeb' : '#dcfce7', color: warn ? '#d97706' : '#16a34a', border: `1px solid ${warn ? '#fde68a' : '#bbf7d0'}`, fontFamily: "'Space Mono', monospace" }}>
                    {Math.round(ck)}%
                  </span>
                </div>

                {/* Progress */}
                <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: '#f3f4f6' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${ck}%`, background: warn ? '#d97706' : '#16a34a' }} />
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-xs" style={{ color: '#6b7280' }}>
                  <div className="flex justify-between">
                    <span>Driver</span><span style={{ color: '#111827', fontWeight: 500 }}>{a.nama_driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rute</span><span style={{ color: '#111827', fontWeight: 500 }}>{a.rute_asal} → {a.rute_tujuan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total paket</span><span style={{ color: '#111827', fontWeight: 500 }}>{a.total_paket}</span>
                  </div>
                  {a.kecepatan_kmh != null && (
                    <div className="flex justify-between">
                      <span>Kecepatan</span><span style={{ color: '#16a34a', fontWeight: 600 }}>{Math.round(a.kecepatan_kmh)} km/h</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs flex items-center gap-1" style={{ color: '#16a34a', fontWeight: 500 }}>
                  Lihat detail
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
