// src/hooks/useAdminAlerts.ts
// Subscribe ke semua alert paket hilang dari admin_room (global, semua truk)
// Dipakai di /dashboard untuk panel alert real-time

import { useEffect, useState } from 'react';
import { connectAsAdmin, type TelemetryUpdatePayload, type PaketHilangPayload } from '@/lib/socket';

export interface AdminAlert {
  id: number;
  trip_id: number;
  kode_truk: string;
  kode_paket?: string;
  jenis_alert: string;
  deskripsi: string;
  timestamp: string;
}

interface UseAdminAlertsReturn {
  alerts: AdminAlert[];
  /** Jumlah alert yang masuk sejak mount (badge notif) */
  newCount: number;
  /** Reset badge counter */
  clearCount: () => void;
}

const MAX_ALERTS = 20;

export function useAdminAlerts(
  onTelemetry?: (payload: TelemetryUpdatePayload) => void
): UseAdminAlertsReturn {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [newCount, setNewCount] = useState(0);

  const clearCount = () => setNewCount(0);

  useEffect(() => {
    const handleTelemetry = (payload: TelemetryUpdatePayload) => {
      onTelemetry?.(payload);
    };

    const handleAlert = (payload: PaketHilangPayload) => {
      const newAlert: AdminAlert = {
        id: payload.alert.id,
        trip_id: payload.trip_id,
        kode_truk: payload.kode_truk,
        kode_paket: payload.alert.kode_paket,
        jenis_alert: payload.alert.jenis_alert,
        deskripsi: payload.alert.deskripsi,
        timestamp: payload.alert.timestamp,
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, MAX_ALERTS));
      setNewCount((c) => c + 1);
    };

    const cleanup = connectAsAdmin(handleTelemetry, handleAlert);
    return cleanup;
  // onTelemetry sengaja tidak di deps — callback boleh berubah tanpa re-subscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { alerts, newCount, clearCount };
}
