'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { armadaAPI, type ArmadaDetail, type PackageItem } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const PaketMap = dynamic(() => import('@/components/map/PaketMap'), { ssr: false });

export default function PaketDetailPage() {
  const { trip_id, paket_id } = useParams<{ trip_id: string; paket_id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<ArmadaDetail | null>(null);
  const [pkg, setPkg] = useState<PackageItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }

    armadaAPI.detail(Number(trip_id))
      .then(res => {
        const found = res.data.packages.find(p => p.id === Number(paket_id));
        if (!found) { router.replace(`/armada/${trip_id}`); return; }
        setTrip(res.data);
        setPkg(found);
      })
      .catch(() => router.replace(`/armada/${trip_id}`))
      .finally(() => setLoading(false));
  }, [trip_id, paket_id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
    </div>
  );

  if (!trip || !pkg) return null;

  const isLost = pkg.is_detected === false;
  const displayLat = isLost ? (pkg.last_lat ?? trip.latitude) : trip.latitude;
  const displayLon = isLost ? (pkg.last_lon ?? trip.longitude) : trip.longitude;
  const hasGps = Boolean(displayLat && displayLon);

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-2 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/armada" className="flex items-center gap-1 font-medium shrink-0" style={{ color: '#6b7280', textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Armada
          </Link>
          <span className="shrink-0 hidden sm:inline" style={{ color: '#d1d5db', fontSize: 12 }}>/</span>
          <Link href={`/armada/${trip_id}`} className="font-medium shrink-0 hidden sm:inline" style={{ color: '#6b7280', textDecoration: 'none' }}>{trip.kode_truk}</Link>
          <span className="shrink-0" style={{ color: '#d1d5db', fontSize: 12 }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>{pkg.kode_paket}</span>
        </span>
      }
      topbarRight={
        isLost ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Tidak Terdeteksi
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16a34a' }} />
            Terdeteksi
          </span>
        )
      }
      contentClassName="flex-1 flex flex-col overflow-hidden"
    >

        {/* Alert banner — hanya jika tidak terdeteksi */}
        {isLost && (
          <div className="flex items-start gap-3 px-5 py-3 text-xs shrink-0" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>
              <strong>Paket tidak terdeteksi oleh RFID reader.</strong>{' '}
              Peta menampilkan <strong>lokasi terakhir diketahui</strong> berdasarkan posisi kendaraan{pkg.waktu_cek ? ` pada ${new Date(pkg.waktu_cek).toLocaleString('id-ID')}` : ''}.
            </span>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Map */}
          <div className="lg:flex-1 relative h-[55vh] lg:h-auto shrink-0" style={{ background: '#e8f5e9', minWidth: 0 }}>
            {hasGps ? (
              <PaketMap lat={displayLat!} lon={displayLon!} isLost={isLost} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: '#f0fdf4' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.3)" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>Menunggu sinyal GPS...</span>
              </div>
            )}
            {/* Map label overlay */}
            {hasGps && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #d1fae5', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10 }}>
                <div className="w-2 h-2 rounded-full" style={{ background: isLost ? '#dc2626' : '#16a34a' }} />
                <span style={{ color: '#374151', fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                  {isLost ? 'Lokasi terakhir diketahui' : 'Posisi kendaraan saat ini'}
                </span>
                {isLost
                  ? pkg.waktu_cek && <span style={{ color: '#9ca3af' }}>· {new Date(pkg.waktu_cek).toLocaleTimeString('id-ID')}</span>
                  : trip.waktu_posisi && <span style={{ color: '#9ca3af' }}>· {new Date(trip.waktu_posisi).toLocaleTimeString('id-ID')}</span>
                }
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="w-full lg:w-80 flex flex-col lg:overflow-y-auto shrink-0" style={{ background: '#ffffff', borderLeft: '1px solid #d1fae5' }}>

            <Section title="Paket" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}>
              <Row label="ID Paket" value={pkg.kode_paket} mono />
              <Row label="RFID Tag EPC" value={pkg.rfid_tag_epc} mono highlight />
              <Row label="Berat" value={`${pkg.berat_kg} kg`} />
              <Row label="Status Paket" value={
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: isLost ? '#fef2f2' : '#dcfce7', color: isLost ? '#dc2626' : '#16a34a', border: `1px solid ${isLost ? '#fecaca' : '#bbf7d0'}` }}>
                  {isLost ? 'Tidak terdeteksi' : 'Terdeteksi'}
                </span>
              } />
              {pkg.waktu_cek && <Row label="Waktu Cek" value={new Date(pkg.waktu_cek).toLocaleString('id-ID')} />}
            </Section>

            <Divider />

            <Section title="Armada" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}>
              <Row label="ID Truk" value={trip.kode_truk} mono />
              <Row label="No. Polisi" value={trip.nomor_polisi} mono />
              <Row label="Jenis" value={trip.jenis_kendaraan ?? '—'} />
              <Row label="Driver" value={trip.nama_driver} />
            </Section>

            <Divider />

            <Section title="Rute Pengiriman" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M12 3l9 9-9 9"/></svg>}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#16a34a' }} />
                  <div className="w-0.5 h-6" style={{ background: '#d1fae5' }} />
                  <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: '#16a34a', background: '#ffffff' }} />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#111827' }}>{trip.rute_asal}</p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>Asal keberangkatan</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#111827' }}>{trip.rute_tujuan}</p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>Tujuan</p>
                  </div>
                </div>
              </div>
              <Row label="Alamat Asal" value={pkg.alamat_asal ?? '—'} />
              <Row label="Alamat Tujuan" value={pkg.alamat_tujuan} />
            </Section>

            <Divider />

            <Section title="Pengirim" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}>
              <Row label="Nama" value={pkg.nama_pengirim ?? '—'} />
              <Row label="Kontak" value={
                pkg.kontak_pengirim
                  ? <a href={`tel:${pkg.kontak_pengirim}`} className="text-xs" style={{ color: '#16a34a', textDecoration: 'none' }}>{pkg.kontak_pengirim}</a>
                  : <span>—</span>
              } />
              <Row label="Alamat" value={pkg.alamat_asal ?? '—'} />
            </Section>

            <Divider />

            <Section title="Penerima" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} accent>
              <Row label="Nama" value={pkg.nama_penerima} />
              <Row label="Kontak" value={
                pkg.kontak_penerima
                  ? <a href={`tel:${pkg.kontak_penerima}`} className="text-xs" style={{ color: '#16a34a', textDecoration: 'none' }}>{pkg.kontak_penerima}</a>
                  : <span>—</span>
              } />
              <Row label="Alamat" value={pkg.alamat_tujuan} />
            </Section>

            <div className="h-4" />
          </div>
        </div>
    </AdminLayout>
  );
}

// ── Komponen helper ─────────────────────────────────────────────────────────

function Section({ title, icon, children, accent }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: accent ? '#16a34a' : '#9ca3af' }}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: accent ? '#16a34a' : '#6b7280' }}>{title}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#f0fdf4' }} />;
}

function Row({ label, value, mono, highlight }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs shrink-0" style={{ color: '#9ca3af', paddingTop: 1 }}>{label}</span>
      <span className="text-xs text-right" style={{
        color: highlight ? '#16a34a' : '#111827',
        fontFamily: mono ? "'Space Mono', monospace" : 'inherit',
        fontWeight: mono ? 600 : 400,
        wordBreak: 'break-all',
        background: highlight ? '#f0fdf4' : 'transparent',
        padding: highlight ? '1px 6px' : 0,
        borderRadius: highlight ? 4 : 0,
        border: highlight ? '1px solid #bbf7d0' : 'none',
      }}>
        {value}
      </span>
    </div>
  );
}
