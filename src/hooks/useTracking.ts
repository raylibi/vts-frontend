// src/hooks/useTracking.ts
// Fetch data tracking paket publik + update posisi real-time via WebSocket
// Dipakai di halaman /tracking/[kode_paket]

import { useEffect, useState } from 'react';
import { trackingAPI, type TrackingResult } from '@/lib/api';
import { subscribePackage, type TelemetryUpdatePayload } from '@/lib/socket';

interface UseTrackingReturn {
  data: TrackingResult | null;
  /** Posisi kendaraan terkini — diupdate real-time */
  position: { lat: number; lon: number } | null;
  lastUpdate: string | null;
  loading: boolean;
  error: string;
}

export function useTracking(kode_paket: string): UseTrackingReturn {
  const [data, setData] = useState<TrackingResult | null>(null);
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data awal
  useEffect(() => {
    if (!kode_paket) return;
    setLoading(true);
    setError('');

    trackingAPI.getByKode(kode_paket)
      .then((res) => {
        setData(res.data);
        if (res.data.posisi_kendaraan) {
          setPosition({
            lat: res.data.posisi_kendaraan.latitude,
            lon: res.data.posisi_kendaraan.longitude,
          });
        }
      })
      .catch(() => setError('Nomor resi tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [kode_paket]);

  // WebSocket: update posisi real-time
  useEffect(() => {
    if (!kode_paket) return;

    const handleTelemetry = (payload: TelemetryUpdatePayload) => {
      setLastUpdate(payload.timestamp);
      setPosition({ lat: payload.gps.lat, lon: payload.gps.lon });

      // Sinkronisasi posisi_kendaraan di data juga
      setData((prev) =>
        prev
          ? {
              ...prev,
              posisi_kendaraan: prev.posisi_kendaraan
                ? {
                    ...prev.posisi_kendaraan,
                    latitude: payload.gps.lat,
                    longitude: payload.gps.lon,
                  }
                : null,
            }
          : prev
      );
    };

    const cleanup = subscribePackage(kode_paket, handleTelemetry);
    return cleanup;
  }, [kode_paket]);

  return { data, position, lastUpdate, loading, error };
}
