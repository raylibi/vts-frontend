'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { manifestAPI, type ManifestDetail } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_MANIFEST: Record<string, { color: string; bg: string; border: string; label: string }> = {
  draft:   { color: '#6b7280', bg: '#f9fafb',  border: '#e5e7eb', label: 'Draft' },
  aktif:   { color: '#16a34a', bg: '#dcfce7',  border: '#bbf7d0', label: 'Aktif' },
  selesai: { color: '#9ca3af', bg: '#f3f4f6',  border: '#e5e7eb', label: 'Selesai' },
};

const STATUS_PAKET: Record<string, { color: string; bg: string; border: string }> = {
  dikirim:  { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  selesai:  { color: '#9ca3af', bg: '#f3f4f6', border: '#e5e7eb' },
  masalah:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

export default function ManifestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [manifest, setManifest] = useState<ManifestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState('');

  // Armada terkait kini disertakan langsung di response detail manifest
  const armada = manifest?.armada ?? null;

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }

    manifestAPI.detail(Number(id))
      .then(res => setManifest(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, router]);

  const filtered = (manifest?.packages ?? []).filter(p =>
    p.kode_paket.toLowerCase().includes(search.toLowerCase()) ||
    p.nama_penerima.toLowerCase().includes(search.toLowerCase()) ||
    p.rfid_tag_epc.toLowerCase().includes(search.toLowerCase())
  );

  const totalBerat = (manifest?.packages ?? []).reduce((s, p) => s + Number(p.berat_kg), 0);

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-2 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/manifest" className="flex items-center gap-1 font-medium shrink-0" style={{ color: '#6b7280', textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Manifest
          </Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
            {manifest?.kode_manifest ?? (loading ? '...' : 'Tidak ditemukan')}
          </span>
        </span>
      }
    >
          {loading ? (
            <div className="flex justify-center py-24">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            </div>
          ) : notFound || !manifest ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Manifest tidak ditemukan.</p>
              <Link href="/manifest" className="text-xs px-4 py-2 rounded-lg font-semibold" style={{ background: '#16a34a', color: '#ffffff', textDecoration: 'none' }}>Kembali ke daftar</Link>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-5">

              {/* Info cards row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Manifest info */}
                <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #d1fae5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <p className="text-xs font-semibold mb-4 uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Info Manifest</p>
                  <div className="space-y-3">
                    <InfoRow label="Kode Manifest">
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600, color: '#111827' }}>{manifest.kode_manifest}</span>
                    </InfoRow>
                    <InfoRow label="Status">
                      {(() => {
                        const s = STATUS_MANIFEST[manifest.status] ?? STATUS_MANIFEST.draft;
                        return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>;
                      })()}
                    </InfoRow>
                    <InfoRow label="Tanggal Dibuat">
                      <span className="text-sm" style={{ color: '#374151' }}>
                        {new Date(manifest.tanggal_dibuat).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </InfoRow>
                    <InfoRow label="Dibuat Oleh">
                      <span className="text-sm" style={{ color: '#374151' }}>{manifest.nama_pembuat ?? '—'}</span>
                    </InfoRow>
                    <InfoRow label="Jumlah Paket">
                      <span className="text-sm font-semibold" style={{ color: '#111827' }}>{manifest.packages.length} paket</span>
                    </InfoRow>
                    <InfoRow label="Total Berat">
                      <span className="text-sm" style={{ color: '#374151' }}>{totalBerat.toFixed(1)} kg</span>
                    </InfoRow>
                  </div>
                </div>

                {/* Armada info */}
                <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #d1fae5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Armada Terkait</p>
                    {!armada && manifest?.status === 'draft' && (
                      <Link
                        href={`/manifest/${id}/assign`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                        style={{ background: '#16a34a', color: '#ffffff', textDecoration: 'none' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Tugaskan ke Armada
                      </Link>
                    )}
                  </div>
                  {armada ? (
                    <div className="space-y-3">
                      <InfoRow label="Kode Truk">
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600, color: '#111827' }}>{armada.kode_truk}</span>
                      </InfoRow>
                      <InfoRow label="No. Polisi">
                        <span className="text-sm" style={{ color: '#374151' }}>{armada.nomor_polisi}</span>
                      </InfoRow>
                      <InfoRow label="Jenis">
                        <span className="text-sm" style={{ color: '#374151' }}>{armada.jenis_kendaraan}</span>
                      </InfoRow>
                      <InfoRow label="Driver">
                        <span className="text-sm" style={{ color: '#374151' }}>{armada.nama_driver}</span>
                      </InfoRow>
                      <InfoRow label="Rute">
                        <span className="text-sm flex items-center gap-1.5" style={{ color: '#374151' }}>
                          {armada.rute_asal}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          {armada.rute_tujuan}
                        </span>
                      </InfoRow>
                      <InfoRow label="Status Trip">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                          style={{ background: armada.status_trip === 'berjalan' ? '#dcfce7' : '#f3f4f6', color: armada.status_trip === 'berjalan' ? '#16a34a' : '#6b7280', border: armada.status_trip === 'berjalan' ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
                          {armada.status_trip}
                        </span>
                      </InfoRow>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 gap-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Belum ada armada yang ditugaskan</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Packages table */}
              <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #d1fae5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid #f0fdf4' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
                    Daftar Paket <span className="ml-1 text-xs font-normal normal-case tracking-normal" style={{ color: '#9ca3af', fontFamily: "'DM Sans', sans-serif" }}>({manifest.packages.length})</span>
                  </p>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari kode, penerima, RFID…"
                    className="text-xs px-3 py-2 rounded-lg outline-none w-full sm:w-56 shrink-0"
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827' }}
                    onFocus={e => { e.target.style.borderColor = '#16a34a'; }}
                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                  />
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>Tidak ada paket ditemukan.</div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-200">
                    <thead>
                      <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
                        {['RFID Tag EPC', 'Kode Paket', 'Penerima', 'Pengirim', 'Alamat Tujuan', 'Berat', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#6b7280', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((pkg, i) => {
                        const s = STATUS_PAKET[pkg.status_paket] ?? STATUS_PAKET.dikirim;
                        return (
                          <tr key={pkg.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0fdf4' : 'none' }}>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-1 rounded font-medium" style={{ fontFamily: "'Space Mono', monospace", background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>{pkg.rfid_tag_epc}</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-xs" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>{pkg.kode_paket}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: '#111827' }}>{pkg.nama_penerima}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#6b7280', maxWidth: 180 }}>{pkg.nama_pengirim ?? '—'}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#6b7280', maxWidth: 180 }}>{pkg.alamat_tujuan}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>{Number(pkg.berat_kg).toFixed(1)} kg</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{pkg.status_paket}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}

                {/* Footer summary */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #f0fdf4', background: '#fafafa' }}>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>
                    Menampilkan {filtered.length} dari {manifest.packages.length} paket
                  </span>
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    Total: <strong style={{ color: '#111827' }}>{totalBerat.toFixed(1)} kg</strong>
                  </span>
                </div>
              </div>

            </div>
          )}
    </AdminLayout>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: '#9ca3af', width: 100 }}>{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}
