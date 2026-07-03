// src/hooks/useAuth.ts
// Baca user dari localStorage + validasi token ke backend
// Redirect ke /login kalau tidak ada token, redirect ke /driver/dashboard kalau role driver

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, type UserData } from '@/lib/api';

interface UseAuthOptions {
  /** Role yang diizinkan. Kalau undefined semua role boleh masuk. */
  requiredRole?: 'admin' | 'driver';
  /** URL redirect kalau tidak authorized. Default: '/login' */
  redirectTo?: string;
}

interface UseAuthReturn {
  user: UserData | null;
  loading: boolean;
  /** true kalau sudah terverifikasi dan authorized */
  authorized: boolean;
}

export function useAuth({ requiredRole, redirectTo = '/login' }: UseAuthOptions = {}): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    const cached = localStorage.getItem('vts_user');

    if (!token) {
      router.replace(redirectTo);
      return;
    }

    // Pakai cached user dulu biar tidak blank
    if (cached) {
      try {
        const parsed: UserData = JSON.parse(cached);
        setUser(parsed);

        // Cek role segera dari cache
        if (requiredRole && parsed.role !== requiredRole) {
          router.replace(parsed.role === 'driver' ? '/driver/dashboard' : '/dashboard');
          return;
        }
      } catch {
        // Cache corrupt — lanjut ke verifikasi backend
      }
    }

    // Verifikasi token ke backend (pastikan tidak expired)
    authAPI.me()
      .then((res) => {
        const u = res.data;
        setUser(u);
        localStorage.setItem('vts_user', JSON.stringify(u));

        if (requiredRole && u.role !== requiredRole) {
          router.replace(u.role === 'driver' ? '/driver/dashboard' : '/dashboard');
          return;
        }
        setAuthorized(true);
      })
      .catch(() => {
        // Token expired atau tidak valid
        localStorage.removeItem('vts_token');
        localStorage.removeItem('vts_user');
        document.cookie = 'vts_token=; path=/; max-age=0';
        router.replace(redirectTo);
      })
      .finally(() => setLoading(false));
  }, [router, requiredRole, redirectTo]);

  return { user, loading, authorized };
}
