// src/components/ui/ProgressBar.tsx
// Progress bar completeness (Ck) — hijau kalau 100%, kuning kalau ada yang hilang

interface ProgressBarProps {
  /** 0–100 */
  pct: number;
  height?: number;
  className?: string;
}

export default function ProgressBar({ pct, height = 4, className = '' }: ProgressBarProps) {
  const warn = pct < 100;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div
      className={`rounded-full overflow-hidden ${className}`}
      style={{ height, background: 'rgba(255,255,255,0.07)' }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${clamped}%`,
          background: warn ? '#f59e0b' : '#14c896',
        }}
      />
    </div>
  );
}
