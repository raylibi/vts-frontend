'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { tripAPI, type PackageTrace } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const PackageTraceMap = dynamic(() => import('@/components/map/PackageTraceMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#e8f5e9' }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  ),
});

function fmtDate(ts: string | null | undefined) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PackageTracePage() {
  const { id, paket_id } = useParams<{ id: string; paket_id: string }>();
  const router = useRouter();

  const [data,    setData]    = useState<PackageTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }

    tripAPI.packageTrace(Number(id), Number(paket_id))
      .then(res => setData(res.data))
      .catch(err => setError(err.message ?? 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [id, paket_id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  );

  const pkg   = data?.package;
  const trace = data?.trace ?? [];

  const firstDetected  = trace.find(p => p.is_detected);
  const lastDetected   = [...trace].reverse().find(p => p.is_detected);
  const firstMissed    = trace.find(p => !p.is_detected);
  const lastMissed     = [...trace].reverse().find(p => !p.is_detected);
  const detectedCount  = trace.filter(p => p.is_detected).length;

  // Paket dinyatakan "ditemukan kembali" jika last RFID event = terdeteksi
  // setelah sebelumnya pernah hilang. Ini mengkoreksi status DB yang bisa stale.
  const lastTraceDetected = trace.length > 0 && trace[trace.length - 1].is_detected === true;
  const recoveredAfterLoss = firstMissed != null && lastTraceDetected;

  // isLost hanya true jika event terakhir JUGA tidak terdeteksi (benar-benar hilang)
  const isLost = pkg?.status_paket === 'hilang' && !lastTraceDetected;
  const effectiveStatus = recoveredAfterLoss ? 'terkirim' : (pkg?.status_paket ?? '-');

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-1.5 sm:gap-2 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/riwayat" className="text-xs sm:text-sm shrink-0" style={{ color: '#9ca3af', textDecoration: 'none' }}>Riwayat</Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <Link href={`/riwayat/${id}`} className="text-xs sm:text-sm shrink-0" style={{ color: '#9ca3af', textDecoration: 'none' }}>Trip #{id}</Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{pkg?.kode_paket ?? `Paket #${paket_id}`}</span>
        </span>
      }
      topbarRight={
        <span className="text-xs px-2 py-1 rounded-md font-medium shrink-0 capitalize"
          style={{ background: isLost ? '#fef2f2' : '#dcfce7', color: isLost ? '#dc2626' : '#16a34a', border: `1px solid ${isLost ? '#fecaca' : '#bbf7d0'}` }}>
          {effectiveStatus}
        </span>
      }
      contentClassName="flex-1 flex flex-col lg:overflow-hidden"
    >
        {error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</div>
              <Link href={`/riwayat/${id}`} className="text-sm mt-2 block" style={{ color: '#6b7280' }}>← Kembali ke detail trip</Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">

            {/* Panel Kiri */}
            <div className="order-2 lg:order-1 w-full lg:w-80 shrink-0 flex flex-col lg:overflow-y-auto" style={{ background: '#ffffff', borderRight: '1px solid #d1fae5' }}>

              {/* Info paket */}
              <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: isLost ? '#fef2f2' : '#dcfce7', border: `1px solid ${isLost ? '#fecaca' : '#bbf7d0'}` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLost ? '#dc2626' : '#16a34a'} strokeWidth="1.8">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>{pkg?.kode_paket}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Jejak Per-Paket</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Pengirim', val: pkg?.nama_pengirim },
                    { label: 'Penerima', val: pkg?.nama_penerima },
                    { label: 'Alamat Tujuan', val: pkg?.alamat_tujuan },
                    { label: 'Berat',    val: pkg?.berat_kg != null ? `${Number(pkg.berat_kg).toFixed(1)} kg` : '-' },
                    { label: 'RFID',     val: pkg?.rfid_tag_epc },
                    { label: 'Status',   val: effectiveStatus },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between gap-2">
                      <span className="shrink-0" style={{ color: '#9ca3af' }}>{r.label}</span>
                      <span className="font-medium text-right" style={{ color: r.label === 'Status' ? (isLost ? '#dc2626' : '#16a34a') : '#111827', wordBreak: 'break-all' }}>{r.val ?? '-'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistik deteksi */}
              <div className="p-5" style={{ borderBottom: '1px solid #f0fdf4' }}>
                <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Deteksi RFID</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: detectedCount,            label: 'Terdeteksi',     color: '#16a34a' },
                    { val: trace.length - detectedCount, label: 'Tidak terdeteksi', color: '#dc2626' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <div className="font-bold text-xl" style={{ fontFamily: "'Space Mono', monospace", color: s.color }}>{s.val}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline kejadian penting */}
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#374151' }}>Kejadian Penting</p>
                <div className="space-y-4 text-xs">
                  {firstDetected && (
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>A</span>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#16a34a' }}>Awal Terdeteksi</div>
                        <div style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>{fmtDate(firstDetected.timestamp)}</div>
                      </div>
                    </div>
                  )}
                  {firstMissed && (
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#dc2626' }}>Pertama Kali Hilang</div>
                        <div style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>{fmtDate(firstMissed.timestamp)}</div>
                        <div style={{ color: '#6b7280', marginTop: 2 }}>
                          {Number(firstMissed.latitude).toFixed(5)}, {Number(firstMissed.longitude).toFixed(5)}
                        </div>
                      </div>
                    </div>
                  )}
                  {recoveredAfterLoss && lastDetected ? (
                    // Paket sempat hilang tapi ditemukan kembali dan berhasil sampai tujuan
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#16a34a' }}>Ditemukan Kembali & Terkirim</div>
                        <div style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>{fmtDate(lastDetected.timestamp)}</div>
                        <div style={{ color: '#6b7280', marginTop: 2 }}>
                          {Number(lastDetected.latitude).toFixed(5)}, {Number(lastDetected.longitude).toFixed(5)}
                        </div>
                      </div>
                    </div>
                  ) : lastDetected && firstMissed && lastMissed && lastDetected && (
                    // Paket hilang dan belum ditemukan (event terakhir = tidak terdeteksi)
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#d97706"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#d97706' }}>Terakhir Terdeteksi</div>
                        <div style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>{fmtDate(lastDetected.timestamp)}</div>
                        <div style={{ color: '#6b7280', marginTop: 2 }}>
                          {Number(lastDetected.latitude).toFixed(5)}, {Number(lastDetected.longitude).toFixed(5)}
                        </div>
                      </div>
                    </div>
                  )}
                  {trace.length === 0 && (
                    <p style={{ color: '#9ca3af' }}>Tidak ada data deteksi untuk paket ini.</p>
                  )}
                </div>
              </div>

              {/* Legenda */}
              <div className="px-5 pb-5">
                <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#374151' }}>Legenda Peta</p>
                <div className="space-y-2">
                  {[
                    { color: '#16a34a', label: 'Jalur terdeteksi' },
                    { color: '#dc2626', label: 'Jalur tidak terdeteksi' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-2 text-xs">
                      <span style={{ width: 28, height: 4, borderRadius: 2, background: l.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: '#6b7280' }}>{l.label}</span>
                    </div>
                  ))}
                  {[
                    { bg: '#16a34a', char: 'A',   label: 'Awal perjalanan' },
                    { bg: '#dcfce7', icon: true,   label: recoveredAfterLoss ? 'Ditemukan kembali & terkirim' : 'Terakhir terdeteksi' },
                    { bg: '#dc2626', warn: true,   label: 'Pertama kali hilang' },
                  ].map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: l.bg }}>
                        {l.char && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{l.char}</span>}
                        {l.icon && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                        {l.warn && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                      </div>
                      <span style={{ color: '#6b7280' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel Kanan — Peta */}
            <div className="order-1 lg:order-2 lg:flex-1 relative h-[55vh] lg:h-auto shrink-0" style={{ background: '#e8f5e9' }}>
              {trace.length > 0 ? (
                <PackageTraceMap trace={trace} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.25)" strokeWidth="1.2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <div className="text-center">
                    <div className="text-sm font-medium" style={{ color: '#6b7280' }}>Tidak ada data jejak</div>
                    <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>Paket ini tidak memiliki data deteksi RFID</div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
    </AdminLayout>
  );
}
