'use client';

// src/app/manifest/page.tsx
// List semua manifest (admin)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { manifestAPI, type ManifestItem } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  draft:   { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  aktif:   { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  selesai: { color: '#9ca3af', bg: '#f3f4f6', border: '#e5e7eb' },
};

export default function ManifestPage() {
  const router = useRouter();
  const [manifests, setManifests] = useState<ManifestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (!token) { router.replace('/login'); return; }
    manifestAPI.list()
      .then(res => setManifests(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = manifests.filter(m =>
    m.kode_manifest.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout
      title="Manifest"
      topbarRight={
        <Link href="/manifest/buat" className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all font-semibold shrink-0" style={{ background: '#16a34a', color: '#ffffff', textDecoration: 'none' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span className="hidden sm:inline">Buat Manifest</span>
          <span className="sm:hidden">Buat</span>
        </Link>
      }
    >
          <div className="mb-5">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode manifest..."
              className="w-full max-w-xs px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#111827' }}
              onFocus={e => { e.target.style.borderColor = '#16a34a'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-sm" style={{ color: '#9ca3af' }}>Belum ada manifest.</div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #d1fae5', background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-140">
                <thead>
                  <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
                    {['Kode Manifest', 'Tanggal Dibuat', 'Jumlah Paket', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#6b7280', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const s = STATUS_STYLE[m.status] ?? STATUS_STYLE.draft;
                    return (
                      <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0fdf4' : 'none' }}>
                        <td className="px-4 py-3 font-semibold" style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#111827' }}>{m.kode_manifest}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#6b7280' }}>{new Date(m.tanggal_dibuat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3" style={{ color: '#111827' }}>{m.jumlah_paket} paket</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{m.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/manifest/${m.id}`} className="text-xs font-medium" style={{ color: '#16a34a', textDecoration: 'none' }}>Detail →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
    </AdminLayout>
  );
}
