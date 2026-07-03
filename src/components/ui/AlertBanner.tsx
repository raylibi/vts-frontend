// src/components/ui/AlertBanner.tsx
// Banner notifikasi error / info / warning — muncul di atas form atau halaman

type AlertType = 'error' | 'warning' | 'info' | 'success';

interface AlertBannerProps {
  type?: AlertType;
  message: string;
  onDismiss?: () => void;
}

const TYPE_STYLES: Record<AlertType, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  error: {
    color: '#f87171',
    bg: 'rgba(220,50,50,0.1)',
    border: 'rgba(220,50,50,0.3)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  warning: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.3)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  success: {
    color: '#14c896',
    bg: 'rgba(20,200,160,0.1)',
    border: 'rgba(20,200,160,0.3)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
};

export default function AlertBanner({ type = 'error', message, onDismiss }: AlertBannerProps) {
  const s = TYPE_STYLES[type];
  return (
    <div
      className="flex items-center gap-2.5 p-3 rounded-lg text-sm mb-5"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
      role="alert"
    >
      {s.icon}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: s.color, cursor: 'pointer', padding: 0, lineHeight: 1 }}
          aria-label="Tutup notifikasi"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
