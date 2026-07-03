// src/components/ui/Badge.tsx
// Status badge generik — dipakai untuk status trip, manifest, paket, alert

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'live';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { color: string; bg: string; border: string }> = {
  success: { color: '#14c896',              bg: 'rgba(20,200,160,0.1)',    border: 'rgba(20,200,160,0.25)' },
  warning: { color: '#f59e0b',              bg: 'rgba(245,158,11,0.1)',    border: 'rgba(245,158,11,0.25)' },
  danger:  { color: '#f87171',              bg: 'rgba(220,80,60,0.1)',     border: 'rgba(220,80,60,0.25)'  },
  info:    { color: '#60a5fa',              bg: 'rgba(96,165,250,0.1)',    border: 'rgba(96,165,250,0.25)' },
  neutral: { color: 'rgba(200,210,230,0.6)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  live:    { color: '#14c896',              bg: 'rgba(20,200,160,0.12)',   border: 'rgba(20,200,160,0.3)'  },
};

/** Map status string backend → variant */
export function statusToVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (['aman', 'aktif', 'berjalan', 'terdeteksi', 'selesai'].includes(s)) return 'success';
  if (['persiapan', 'draft', 'pending'].includes(s)) return 'neutral';
  if (['hilang', 'anomali', 'baru'].includes(s)) return 'danger';
  if (['peringatan'].includes(s)) return 'warning';
  return 'neutral';
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full capitalize ${className}`}
      style={{
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontFamily: "'Space Mono', monospace",
        letterSpacing: '0.04em',
      }}
    >
      {variant === 'live' && (
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ background: '#14c896' }}
        />
      )}
      {children}
    </span>
  );
}
