'use client';

// src/components/layout/AdminLayout.tsx
// Wrapper layout untuk semua halaman admin

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  /** Judul topbar — string biasa, atau node (mis. breadcrumb) */
  title: React.ReactNode;
  /** Konten tambahan di sebelah kanan topbar (badge, tombol, dll) */
  topbarRight?: React.ReactNode;
  /**
   * Override className untuk elemen <main>. Default: konten bisa scroll dengan
   * padding standar. Halaman full-bleed (peta, panel split) bisa mengganti ini,
   * mis. "flex-1 flex flex-col lg:flex-row lg:overflow-hidden".
   */
  contentClassName?: string;
}

export default function AdminLayout({
  children,
  title,
  topbarRight,
  contentClassName = 'flex-1 overflow-y-auto p-4 sm:p-6',
}: AdminLayoutProps) {
  const router = useRouter();
  const [initials, setInitials] = useState('AD');

  useEffect(() => {
    const token = localStorage.getItem('vts_token');
    const userData = localStorage.getItem('vts_user');
    if (!token || !userData) { router.replace('/login'); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role === 'driver') { router.replace('/driver/dashboard'); return; }
    if (parsed.nama) {
      setInitials(
        parsed.nama.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
      );
    }
  }, [router]);

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: '#f0fdf4', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}
    >
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="h-12 flex items-center px-4 sm:px-5 gap-3 shrink-0"
          style={{ background: '#ffffff', borderBottom: '1px solid #d1fae5' }}
        >
          <span
            className="text-xs uppercase tracking-widest flex-1 truncate min-w-0"
            style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a', fontWeight: 600 }}
          >
            {title}
          </span>

          {topbarRight}

          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ml-2"
            style={{
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#16a34a',
            }}
          >
            {initials}
          </div>
        </header>

        {/* Content */}
        <main className={contentClassName}>{children}</main>
      </div>
    </div>
  );
}
