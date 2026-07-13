// src/hooks/useArmada.ts
// Fetch list armada aktif + update completeness_pct real-time via WebSocket

import { useEffect, useState } from 'react';
import { armadaAPI, type ArmadaItem } from '@/lib/api';
import { connectAsAdmin, type TelemetryUpdatePayload, type PaketHilangPayload } from '@/lib/socket';

interface UseArmadaReturn {
  armada: ArmadaItem[];
  loading: boolean;
  error: string;
  /** Jumlah truk dengan completeness < 100% */
  warningCount: number;
}

export function useArmada(): UseArmadaReturn {
  const [armada, setArmada] = useState<ArmadaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data awal
  useEffect(() => {
    armadaAPI.list()
      .then((res) => setArmada(res.data))
      .catch((err: Error) => setError(err.message ?? 'Gagal memuat data armada.'))
      .finally(() => setLoading(false));
  }, []);

  // WebSocket: update completeness + posisi kalau ada telemetry baru
  useEffect(() => {
    const handleTelemetry = (payload: TelemetryUpdatePayload) => {
      setArmada((prev) =>
        prev.map((a) =>
          a.trip_id === payload.trip_id
            ? {
                ...a,
                completeness_pct: payload.completeness_pct,
                // gps null (belum fix) → pertahankan posisi terakhir
                latitude: payload.gps ? payload.gps.lat : a.latitude,
                longitude: payload.gps ? payload.gps.lon : a.longitude,
              }
            : a
        )
      );
    };

    // Alert tidak mengubah list armada — hanya completeness
    const handleAlert = (_: PaketHilangPayload) => {};

    const cleanup = connectAsAdmin(handleTelemetry, handleAlert);
    return cleanup;
  }, []);

  const warningCount = armada.filter((a) => (a.completeness_pct ?? 100) < 100).length;

  return { armada, loading, error, warningCount };
}
