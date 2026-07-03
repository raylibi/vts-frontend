'use client';

// src/app/page.tsx
// Landing page publik — pelanggan input nomor resi

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trackingAPI } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [kode, setKode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = kode.trim().toUpperCase();
    if (!trimmed) { setError('Masukkan nomor resi terlebih dahulu.'); return; }
    setError('');
    setLoading(true);
    try {
      await trackingAPI.getByKode(trimmed);
      router.push(`/tracking/${trimmed}`);
    } catch {
      setError('Nomor resi tidak ditemukan. Periksa kembali kode resi Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf4', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(22,163,74,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(22,163,74,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5" style={{ background: '#ffffff', borderBottom: '1px solid #d1fae5', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#16a34a' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" /></svg>
          </div>
          <span className="text-sm font-bold tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>VTS LOGISTIK</span>
        </div>
        <Link href="/login" className="text-xs px-4 py-2 rounded-lg transition-all font-semibold" style={{ background: '#16a34a', color: '#ffffff', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', textDecoration: 'none' }}>
          Login Admin
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-xs uppercase tracking-widest mb-6 flex items-center gap-2" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
          <span className="w-6 h-px inline-block" style={{ background: '#16a34a' }} />
          Lacak paket Anda secara real-time
          <span className="w-6 h-px inline-block" style={{ background: '#16a34a' }} />
        </div>
        <h1 className="text-5xl font-light leading-tight mb-4" style={{ letterSpacing: '-0.02em', maxWidth: 600, color: '#111827' }}>
          Di mana paket<br />
          <span className="font-semibold" style={{ color: '#16a34a' }}>Anda sekarang?</span>
        </h1>
        <p className="text-sm mb-12 max-w-sm" style={{ color: '#6b7280', lineHeight: 1.8 }}>
          Pantau posisi truk pengiriman dan status paket Anda secara langsung menggunakan teknologi RFID + GPS.
        </p>

        {/* Form */}
        <form onSubmit={handleTrack} className="w-full max-w-md">
          <div className="flex gap-3">
            <input
              value={kode}
              onChange={e => setKode(e.target.value)}
              placeholder="Masukkan nomor resi, contoh: PKT-001"
              className="flex-1 px-4 py-3.5 rounded-xl text-sm outline-none"
              style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#111827', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#f0fdf4'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#ffffff'; }}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shrink-0"
              style={{ background: loading ? 'rgba(22,163,74,0.6)' : '#16a34a', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '...' : 'Lacak'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-center" style={{ color: '#dc2626' }}>{error}</p>
          )}
        </form>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-16">
          {['RFID Real-time', 'GPS Tracking', 'Alert Otomatis'].map(f => (
            <span key={f} className="text-xs px-4 py-2 rounded-full" style={{ background: '#ffffff', border: '1px solid #d1fae5', color: '#16a34a', fontFamily: "'Space Mono', monospace", boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              {f}
            </span>
          ))}
        </div>
      </main>

      <footer className="relative z-10 text-center pb-8 text-xs" style={{ color: '#9ca3af', fontFamily: "'Space Mono', monospace" }}>
        VTS LOGISTIK · Telkom University Capstone Design 2026
      </footer>
    </div>
  );
}
