// src/middleware.ts
// Next.js Edge Middleware — proteksi route sebelum halaman dirender
// Jalan di edge runtime, bukan Node.js, jadi tidak bisa pakai library Node

import { NextRequest, NextResponse } from 'next/server';

// ─── Konfigurasi route ────────────────────────────────────────────────────────

/** Route yang butuh login (semua role) */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/armada',
  '/manifest',
  '/riwayat',
  '/driver',
  '/settings',
];

/** Route khusus admin — driver tidak boleh masuk */
const ADMIN_ONLY_PREFIXES = [
  '/dashboard',
  '/armada',
  '/manifest',
  '/riwayat',
  '/settings',
];

/** Route khusus driver — admin tetap boleh (redirect ke dashboard) */
const DRIVER_ONLY_PREFIXES = [
  '/driver',
];

/** Route publik — kalau sudah login, redirect ke dashboard yang sesuai */
const PUBLIC_AUTH_ROUTES = ['/login'];

// ─── Helper ───────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminOnly(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isDriverOnly(pathname: string): boolean {
  return DRIVER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.includes(pathname);
}

/**
 * Decode JWT payload tanpa verifikasi signature.
 * Verifikasi signature dilakukan di backend — di sini hanya butuh role & exp.
 */
function decodeJwtPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('vts_token')?.value;
  const payload = token ? decodeJwtPayload(token) : null;

  // Cek apakah token expired
  const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : true;
  const isLoggedIn = !!token && !!payload && !isExpired;
  const role = payload?.role as 'admin' | 'driver' | undefined;

  // ── Sudah login, akses /login → redirect ke dashboard sesuai role ──────────
  if (isPublicAuthRoute(pathname) && isLoggedIn) {
    const target = role === 'driver' ? '/driver/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // ── Route protected, belum login → ke /login ─────────────────────────────
  if (isProtected(pathname) && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Sudah login, akses route admin tapi role driver → ke driver dashboard ──
  if (isLoggedIn && isAdminOnly(pathname) && role === 'driver') {
    return NextResponse.redirect(new URL('/driver/dashboard', request.url));
  }

  // ── Sudah login, akses route driver tapi role admin → ke dashboard ─────────
  if (isLoggedIn && isDriverOnly(pathname) && role === 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// ─── Matcher — middleware hanya jalan di route ini ────────────────────────────
// Exclude: _next/static, _next/image, favicon, api routes, tracking publik
export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/armada/:path*',
    '/manifest/:path*',
    '/riwayat/:path*',
    '/driver/:path*',
    '/settings/:path*',
  ],
};