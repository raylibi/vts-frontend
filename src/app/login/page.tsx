'use client';

// src/app/login/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { setSession } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successRole, setSuccessRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    if (token) {
      try {
        const user = JSON.parse(localStorage.getItem('vts_user') || '{}');
        router.replace(user.role === 'driver' ? '/driver/dashboard' : '/dashboard');
      } catch {
        // Cache user korup — biarkan user login ulang
        localStorage.removeItem('vts_user');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.login(email.trim(), password);

      setSession(data.data.token, data.data.user);

      const role: string = data.data.user.role;
      setSuccessRole(role);
      setSuccess(true);

      setTimeout(() => {
        router.push(role === 'driver' ? '/driver/dashboard' : '/dashboard');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email atau password salah.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ background: '#ffffff', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(22,163,74,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(22,163,74,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ─── Left Panel ───────────────────────────────── */}
      <div
        className="flex-1 hidden md:flex flex-col justify-between p-12 relative z-10"
        style={{ background: '#f0fdf4', borderRight: '1px solid #d1fae5' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: '#16a34a',
              border: '1px solid #15803d',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
              <path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
            </svg>
          </div>
          <div>
            <div
              className="text-sm font-bold tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}
            >
              VTS LOGISTIK
            </div>
            <div
              className="text-[10px] tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}
            >
              VEHICLE TRACKING SYSTEM
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"
            style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}
          >
            <span className="w-6 h-px inline-block" style={{ background: '#16a34a' }} />
            Real-time monitoring
          </div>
          <h1
            className="text-4xl font-light leading-tight mb-4"
            style={{ color: '#111827', letterSpacing: '-0.01em' }}
          >
            Pantau armada<br />
            &amp; paket{' '}
            <span className="font-semibold" style={{ color: '#16a34a' }}>secara live</span>
          </h1>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#6b7280' }}>
            Sistem pelacakan paket terintegrasi RFID + GPS untuk memantau keberadaan
            paket di dalam truk secara individual dan berkelanjutan.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-8">
          <div>
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}
            >
              ● LIVE
            </div>
            <div
              className="text-[11px] tracking-wider mt-1"
              style={{ color: '#9ca3af' }}
            >
              tracking your packages
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel (Form) ────────────────────────── */}
      <div className="w-full md:w-[420px] flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-sm">
          {!success ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-1" style={{ color: '#111827' }}>
                  Masuk ke sistem
                </h2>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Akses dashboard admin atau driver
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div
                  className="flex items-center gap-2 text-sm mb-5 p-3 rounded-lg"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                  }}
                  role="alert"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} noValidate>
                {/* Email */}
                <div className="mb-5">
                  <label
                    htmlFor="email"
                    className="block text-[11px] uppercase tracking-[0.12em] mb-2"
                    style={{ fontFamily: "'Space Mono', monospace", color: '#6b7280' }}
                  >
                    Email
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#9ca3af" strokeWidth="2"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polyline points="2,4 12,13 22,4" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@vts.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #d1d5db',
                        color: '#111827',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#16a34a';
                        e.target.style.background = '#f0fdf4';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.background = '#f9fafb';
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mb-6">
                  <label
                    htmlFor="password"
                    className="block text-[11px] uppercase tracking-[0.12em] mb-2"
                    style={{ fontFamily: "'Space Mono', monospace", color: '#6b7280' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#9ca3af" strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 rounded-lg text-sm outline-none transition-all"
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #d1d5db',
                        color: '#111827',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#16a34a';
                        e.target.style.background = '#f0fdf4';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.background = '#f9fafb';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: loading ? 'rgba(22,163,74,0.6)' : '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.02em',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Memverifikasi...
                    </span>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </form>

              <hr className="my-7" style={{ border: 'none', borderTop: '1px solid #f3f4f6' }} />
              <p className="text-xs text-center leading-relaxed" style={{ color: '#9ca3af' }}>
                Sistem ini untuk admin &amp; driver yang terdaftar.
                <br />
                Tracking paket?{' '}
                <Link href="/" style={{ color: '#16a34a', textDecoration: 'underline' }}>
                  Halaman utama
                </Link>
              </p>
            </>
          ) : (
            /* Success state */
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-semibold mb-1" style={{ color: '#111827' }}>
                  Login berhasil!
                </div>
                <div className="text-sm" style={{ color: '#6b7280' }}>
                  {successRole === 'driver'
                    ? 'Mengarahkan ke dashboard driver...'
                    : 'Mengarahkan ke dashboard admin...'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
