// src/components/dashboard/PackageRow.tsx
// Satu baris paket dalam daftar muatan truk

interface PackageRowProps {
  kode_paket: string;
  nama_penerima: string;
  alamat_tujuan?: string;
  berat_kg?: number;
  is_detected: boolean | null;
}

export default function PackageRow({
  kode_paket,
  nama_penerima,
  alamat_tujuan,
  berat_kg,
  is_detected,
}: PackageRowProps) {
  const dotColor =
    is_detected === false
      ? '#f87171'
      : is_detected === true
      ? '#14c896'
      : 'rgba(200,210,230,0.2)';

  const borderColor =
    is_detected === false ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.05)';

  return (
    <div
      className="flex items-center justify-between p-2.5 rounded-lg text-xs"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="font-medium truncate"
          style={{ fontFamily: "'Space Mono', monospace", color: '#e8f0fe' }}
        >
          {kode_paket}
        </div>
        <div className="mt-0.5 truncate" style={{ color: 'rgba(200,210,230,0.4)' }}>
          {nama_penerima}
          {alamat_tujuan && ` · ${alamat_tujuan}`}
        </div>
        {berat_kg != null && (
          <div className="mt-0.5" style={{ color: 'rgba(200,210,230,0.3)' }}>
            {berat_kg} kg
          </div>
        )}
      </div>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 ml-3"
        style={{ background: dotColor }}
        title={
          is_detected === false
            ? 'Tidak terdeteksi'
            : is_detected === true
            ? 'Terdeteksi'
            : 'Belum dicek'
        }
      />
    </div>
  );
}
