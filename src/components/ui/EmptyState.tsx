// src/components/ui/EmptyState.tsx
// Empty state dengan icon dan pesan

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

const DEFAULT_ICON = (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(20,200,160,0.2)" strokeWidth="1.2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

export default function EmptyState({ message = 'Tidak ada data.', icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      {icon ?? DEFAULT_ICON}
      <p className="text-sm" style={{ color: 'rgba(200,210,230,0.3)' }}>
        {message}
      </p>
    </div>
  );
}
