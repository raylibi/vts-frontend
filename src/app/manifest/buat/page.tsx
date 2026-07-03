'use client';

// src/app/manifest/buat/page.tsx
// Form buat manifest baru + input paket RFID satu per satu

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { manifestAPI, type CreateManifestBody } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';

interface PackageForm {
  rfid_tag_epc: string;
  kode_paket: string;
  nama_pengirim: string;
  nama_penerima: string;
  alamat_tujuan: string;
  berat_kg: string;
}

const EMPTY_PKG: PackageForm = { rfid_tag_epc: '', kode_paket: '', nama_pengirim: '', nama_penerima: '', alamat_tujuan: '', berat_kg: '' };

function generateKodePaket(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `PKT-${date}-${suffix}`;
}

function generateKodeManifest(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `MNF-${date}-${rand}`;
}

export default function ManifestBuatPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageForm[]>([{ ...EMPTY_PKG, kode_paket: generateKodePaket() }]);
  const [kodeManifest] = useState(() => generateKodeManifest());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updatePkg = (i: number, field: keyof PackageForm, val: string) => {
    setPackages(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const addRow = () => setPackages(prev => [...prev, { ...EMPTY_PKG, kode_paket: generateKodePaket() }]);
  const removeRow = (i: number) => setPackages(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const invalid = packages.some(p => !p.rfid_tag_epc.trim() || !p.nama_penerima.trim() || !p.alamat_tujuan.trim() || !p.berat_kg);
    if (invalid) { setError('Semua field wajib diisi untuk setiap paket.'); return; }

    setLoading(true);
    try {
      const body: CreateManifestBody = {
        kode_manifest: kodeManifest,
        packages: packages.map(p => ({
          rfid_tag_epc: p.rfid_tag_epc.trim().toUpperCase(),
          kode_paket: p.kode_paket.trim().toUpperCase(),
          nama_pengirim: p.nama_pengirim.trim(),
          nama_penerima: p.nama_penerima.trim(),
          alamat_tujuan: p.alamat_tujuan.trim(),
          berat_kg: parseFloat(p.berat_kg),
        })),
      };
      const res = await manifestAPI.create(body);
      router.push(`/manifest/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat manifest.');
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    color: '#111827',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  } as const;

  return (
    <AdminLayout
      title={
        <span className="flex items-center gap-2 normal-case" style={{ letterSpacing: 'normal' }}>
          <Link href="/manifest" className="flex items-center gap-1 font-medium shrink-0" style={{ color: '#6b7280', textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> Manifest
          </Link>
          <span className="shrink-0" style={{ color: '#d1d5db' }}>/</span>
          <span className="font-semibold truncate min-w-0" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>Buat Manifest Baru</span>
        </span>
      }
    >
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Buat Manifest Baru</h2>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Masukkan data setiap paket beserta RFID tag EPC-nya.</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                <span style={{ color: '#6b7280' }}>Kode Manifest:</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#16a34a' }}>{kodeManifest}</span>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {packages.map((pkg, i) => (
                  <div key={i} className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #d1fae5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>PAKET #{i + 1}</span>
                      {packages.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} className="text-xs px-2 py-1 rounded" style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }}>Hapus</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Kode resi — auto-generate, tidak bisa diubah */}
                      <div>
                        <label className="block text-xs mb-1.5 font-medium" style={{ color: '#6b7280' }}>
                          Kode Resi <span style={{ color: '#9ca3af', fontWeight: 400 }}>(otomatis)</span>
                        </label>
                        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #d1fae5', height: 36 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: 0.5 }}>{pkg.kode_paket}</span>
                        </div>
                      </div>
                      {/* RFID Tag EPC */}
                      <div>
                        <label className="block text-xs mb-1.5 font-medium" style={{ color: '#6b7280' }}>RFID Tag EPC *</label>
                        <input value={pkg.rfid_tag_epc} onChange={e => updatePkg(i, 'rfid_tag_epc', e.target.value)} placeholder="Contoh: E200..." style={inputStyle} />
                      </div>
                      {[
                        { field: 'nama_pengirim' as const, label: 'Nama Pengirim', placeholder: 'PT. Maju Jaya' },
                        { field: 'nama_penerima' as const, label: 'Nama Penerima *', placeholder: 'Budi Santoso' },
                      ].map(f => (
                        <div key={f.field}>
                          <label className="block text-xs mb-1.5 font-medium" style={{ color: '#6b7280' }}>{f.label}</label>
                          <input value={pkg[f.field]} onChange={e => updatePkg(i, f.field, e.target.value)} placeholder={f.placeholder} style={inputStyle} />
                        </div>
                      ))}
                      <div className="sm:col-span-2">
                        <label className="block text-xs mb-1.5 font-medium" style={{ color: '#6b7280' }}>Alamat Tujuan *</label>
                        <input value={pkg.alamat_tujuan} onChange={e => updatePkg(i, 'alamat_tujuan', e.target.value)} placeholder="Jl. Sudirman No. 1, Jakarta" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5 font-medium" style={{ color: '#6b7280' }}>Berat (kg) *</label>
                        <input type="number" min="0.1" step="0.1" value={pkg.berat_kg} onChange={e => updatePkg(i, 'berat_kg', e.target.value)} placeholder="1.5" style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row */}
              <button type="button" onClick={addRow} className="mt-4 w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all font-medium"
                style={{ border: '1px dashed #bbf7d0', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tambah paket
              </button>

              {/* Submit */}
              <div className="flex items-center justify-between mt-6 pt-6" style={{ borderTop: '1px solid #d1fae5' }}>
                <span className="text-sm" style={{ color: '#6b7280' }}>{packages.length} paket akan disimpan</span>
                <button type="submit" disabled={loading} className="px-8 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: loading ? 'rgba(22,163,74,0.6)' : '#16a34a', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Menyimpan...' : 'Simpan Manifest'}
                </button>
              </div>
            </form>
          </div>
    </AdminLayout>
  );
}
