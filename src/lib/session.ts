// src/lib/session.ts
// Helper sesi login. Cookie vts_token hanya dipakai Next.js middleware untuk
// proteksi route di server; request API memakai header Authorization (localStorage).

const COOKIE_NAME = 'vts_token';

function secureSuffix(): string {
  // Tandai Secure kalau situs diakses via HTTPS agar cookie tidak terkirim lewat HTTP
  return typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '; Secure'
    : '';
}

/** Simpan token setelah login (localStorage + cookie untuk middleware). */
export function setSession(token: string, user: unknown): void {
  localStorage.setItem('vts_token', token);
  localStorage.setItem('vts_user', JSON.stringify(user));
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=86400; SameSite=Lax${secureSuffix()}`;
}

/** Hapus semua jejak sesi (dipakai saat logout / token tidak valid). */
export function clearSession(): void {
  localStorage.removeItem('vts_token');
  localStorage.removeItem('vts_user');
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secureSuffix()}`;
}
