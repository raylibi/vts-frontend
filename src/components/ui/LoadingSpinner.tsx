// src/components/ui/LoadingSpinner.tsx
// Centered loading spinner — pakai di halaman saat fetch data

interface LoadingSpinnerProps {
  size?: number;
  fullPage?: boolean;
  label?: string;
}

export default function LoadingSpinner({ size = 24, fullPage = false, label }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#14c896"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      {label && (
        <span
          className="text-xs"
          style={{ fontFamily: "'Space Mono', monospace", color: 'rgba(20,200,160,0.6)' }}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0e1a' }}
      >
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center py-16">{spinner}</div>;
}
