// src/components/ui/StatCard.tsx
// Metric card untuk angka ringkasan (total truk, paket, alert, dll)

interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export default function StatCard({ value, label, color = '#e8f0fe' }: StatCardProps) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="text-xl font-semibold leading-none"
        style={{ color, fontFamily: "'Space Mono', monospace" }}
      >
        {value}
      </div>
      <div className="text-xs mt-1.5" style={{ color: 'rgba(200,210,230,0.4)' }}>
        {label}
      </div>
    </div>
  );
}
