// src/components/dashboard/AlertItem.tsx
// Satu item alert paket hilang — dipakai di panel dashboard dan armada detail

interface AlertItemProps {
  kode_paket?: string;
  kode_truk?: string;
  deskripsi: string;
  timestamp: string;
}

export default function AlertItem({ kode_paket, kode_truk, deskripsi, timestamp }: AlertItemProps) {
  const time = new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="p-2.5 text-xs"
      style={{
        background: 'rgba(220,80,60,0.07)',
        border: '1px solid rgba(220,80,60,0.2)',
        borderLeft: '3px solid #f87171',
      }}
    >
      <div className="font-medium" style={{ color: '#f87171' }}>
        {kode_paket ? `${kode_paket} — ` : ''}Paket tidak terdeteksi
      </div>
      <div className="mt-0.5" style={{ color: 'rgba(200,210,230,0.4)' }}>
        {kode_truk && `${kode_truk} · `}{time}
      </div>
      {deskripsi && (
        <div className="mt-1" style={{ color: 'rgba(200,210,230,0.3)' }}>
          {deskripsi}
        </div>
      )}
    </div>
  );
}
