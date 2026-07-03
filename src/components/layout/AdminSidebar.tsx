'use client';

// src/components/layout/AdminSidebar.tsx
// Sidebar navigasi admin — reusable di semua halaman admin

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { destroySocket } from '@/lib/socket';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/armada',
    label: 'Armada',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v4h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    href: '/manifest',
    label: 'Manifest',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/riwayat',
    label: 'Riwayat',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="12 8 12 12 14 14" />
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Pengaturan',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    destroySocket();
    localStorage.removeItem('vts_token');
    localStorage.removeItem('vts_user');
    document.cookie = 'vts_token=; path=/; max-age=0';
    router.push('/login');
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="w-14 flex flex-col items-center py-4 gap-2 flex-shrink-0"
      style={{ background: '#15803d', borderRight: '1px solid #166534' }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
        aria-label="Ke Dashboard"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
          <path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
        </svg>
      </Link>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{
              color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
              background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
              border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
            }}
          >
            {item.icon}
          </Link>
        );
      })}

      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        aria-label="Logout"
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
        style={{ color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </aside>
  );
}
