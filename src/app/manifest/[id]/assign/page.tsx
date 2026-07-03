'use client';

// src/app/manifest/[id]/assign/page.tsx
// Form assign manifest ke truk + driver → buat trip baru

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  manifestAPI,
  adminAPI,
  tripAPI,
  type ManifestDetail,
  type TruckOption,
  type DriverOption,
} from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const inputStyle = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#111827',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
} as const;

export default function AssignManifestPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [manifest, setManifest] = useState<ManifestDetail | null>(null);
  const [trucks,   setTrucks]   = useState<TruckOption[]>([]);
  const [drivers,  setDrivers]  = useState<DriverOption[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [truckId,    setTruckId]    = useState('');
  const [driverId,   setDriverId]   = useState('');
  const [ruteAsal,   setRuteAsal]   = useState('');
  const [ruteTujuan, setRuteTujuan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }

    Promise.all([
      manifestAPI.detail(Number(id)),
      adminAPI.trucks(),
      adminAPI.drivers(),
    ])
      .then(([mRes, tRes, dRes]) => {
        // Manifest yang sudah aktif/selesai tidak bisa di-assign ulang
        if (mRes.data.status !== 'draft') {
          router.replace(`/manifest/${id}`);
          return;
        }
        setManifest(mRes.data);
        setTrucks(tRes.data);
        setDrivers(dRes.data);
      })
      .catch(() => setError('Gagal memuat data. Coba refresh halaman.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!truckId || !driverId || !ruteAsal.trim() || !ruteTujuan.trim()) {
      setError('Semua field wajib diisi.');
      return;
    }

    const selectedTruck = trucks.find(t => t.id === Number(truckId));
    if (selectedTruck && Number(selectedTruck.trip_aktif) > 0) {
      setError('Truk ini sedang dalam perjalanan aktif. Pilih truk lain.');
      return;
    }
    const selectedDriver = drivers.find(d => d.id === Number(driverId));
    if (selectedDriver && Number(selectedDriver.trip_aktif) > 0) {
      setError('Driver ini sedang dalam perjalanan aktif. Pilih driver lain.');
      return;
    }

    setSubmitting(true);
    try {
      await tripAPI.create({
        truck_id:    Number(truckId),
        driver_id:   Number(driverId),
        manifest_id: Number(id),
        rute_asal:   ruteAsal.trim(),
        rute_tujuan: ruteTujuan.trim(),
      });
      router.push(`/manifest/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat penugasan.');
      setSubmitting(false);
    }
  };

  const availableTrucks  = trucks.filter(t => Number(t.trip_aktif) === 0);
  const availableDrivers = drivers.filter(d => Number(d.trip_aktif) === 0);

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-2 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/manifest" className="flex items-center gap-1 font-medium shrink-0" style={{ color: '#6b7280', textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Manifest
          </Link>
          <span className="shrink-0 hidden sm:inline" style={{ color: '#d1d5db' }}>/</span>
          <Link href={`/manifest/${id}`} className="font-medium shrink-0 hidden sm:inline" style={{ color: '#6b7280', textDecoration: 'none' }}>
            {manifest?.kode_manifest ?? id}
          </Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Tugaskan ke Armada</span>
        </span>
      }
    >
          {loading ? (
            <div className="flex justify-center py-24">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-5">

              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Tugaskan ke Armada</h2>
                <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Pilih truk dan driver untuk membawa manifest ini.</p>
              </div>

              {/* Info manifest */}
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#ffffff', border: '1px solid #d1fae5' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{manifest?.kode_manifest}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{manifest?.packages.length} paket · dibuat {manifest ? new Date(manifest.tanggal_dibuat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>Draft</span>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg p-3 flex items-start gap-2 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {/* Pilih Truk */}
                <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid #d1fae5' }}>
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                    Kendaraan
                  </div>

                  {availableTrucks.length === 0 ? (
                    <div className="text-sm py-2" style={{ color: '#d97706' }}>
                      Tidak ada truk yang tersedia saat ini (semua sedang bertugas).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {trucks.map(t => {
                        const busy     = Number(t.trip_aktif) > 0;
                        const selected = truckId === String(t.id);
                        return (
                          <label
                            key={t.id}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                            style={{
                              border: selected ? '1.5px solid #16a34a' : '1px solid #e5e7eb',
                              background: busy ? '#f9fafb' : selected ? '#f0fdf4' : '#ffffff',
                              opacity: busy ? 0.5 : 1,
                              cursor: busy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="truck"
                              value={t.id}
                              disabled={busy}
                              checked={selected}
                              onChange={() => setTruckId(String(t.id))}
                              className="shrink-0"
                              style={{ accentColor: '#16a34a' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{t.kode_truk}</span>
                                <span className="text-xs" style={{ color: '#6b7280' }}>{t.nomor_polisi}</span>
                                {busy && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>Sedang bertugas</span>}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{t.jenis_kendaraan}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pilih Driver */}
                <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid #d1fae5' }}>
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                    Driver
                  </div>

                  {availableDrivers.length === 0 ? (
                    <div className="text-sm py-2" style={{ color: '#d97706' }}>
                      Tidak ada driver yang tersedia saat ini (semua sedang bertugas).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {drivers.map(d => {
                        const busy     = Number(d.trip_aktif) > 0;
                        const selected = driverId === String(d.id);
                        return (
                          <label
                            key={d.id}
                            className="flex items-center gap-3 p-3 rounded-lg transition-all"
                            style={{
                              border: selected ? '1.5px solid #16a34a' : '1px solid #e5e7eb',
                              background: busy ? '#f9fafb' : selected ? '#f0fdf4' : '#ffffff',
                              opacity: busy ? 0.5 : 1,
                              cursor: busy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="driver"
                              value={d.id}
                              disabled={busy}
                              checked={selected}
                              onChange={() => setDriverId(String(d.id))}
                              className="shrink-0"
                              style={{ accentColor: '#16a34a' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm" style={{ color: '#111827' }}>{d.nama}</span>
                                {busy && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>Sedang bertugas</span>}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{d.no_telepon || d.email}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Rute */}
                <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid #d1fae5' }}>
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                    Rute Pengiriman
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Asal *</label>
                      <input
                        value={ruteAsal}
                        onChange={e => setRuteAsal(e.target.value)}
                        placeholder="JNE Bojongsoang"
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#f0fdf4'; }}
                        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#f9fafb'; }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Tujuan *</label>
                      <input
                        value={ruteTujuan}
                        onChange={e => setRuteTujuan(e.target.value)}
                        placeholder="JNE Cibabat"
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#f0fdf4'; }}
                        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#f9fafb'; }}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between pt-2">
                  <Link
                    href={`/manifest/${id}`}
                    className="text-sm font-medium px-4 py-2.5 rounded-lg"
                    style={{ color: '#6b7280', border: '1px solid #e5e7eb', background: '#ffffff', textDecoration: 'none' }}
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting || !truckId || !driverId || !ruteAsal.trim() || !ruteTujuan.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-opacity"
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      cursor: (submitting || !truckId || !driverId) ? 'not-allowed' : 'pointer',
                      opacity: (submitting || !truckId || !driverId || !ruteAsal.trim() || !ruteTujuan.trim()) ? 0.5 : 1,
                    }}
                  >
                    {submitting && (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    )}
                    {submitting ? 'Menyimpan...' : 'Tugaskan ke Armada'}
                  </button>
                </div>

              </form>
            </div>
          )}
    </AdminLayout>
  );
}
