// src/hooks/useArmadaDetail.ts
// Fetch detail muatan satu truk + real-time telemetry + alert paket hilang

import { useEffect, useState } from 'react';
import { armadaAPI, type ArmadaDetail, type PackageItem, type AlertItem } from '@/lib/api';
import { subscribeTrip, type TelemetryUpdatePayload, type PaketHilangPayload } from '@/lib/socket';

interface UseArmadaDetailReturn {
  data: ArmadaDetail | null;
  packages: PackageItem[];
  alerts: AlertItem[];
  completeness_pct: number;
  lastUpdate: string | null;
  loading: boolean;
  error: string;
  /** GPS posisi terkini — diupdate real-time */
  position: { lat: number; lon: number } | null;
}

export function useArmadaDetail(trip_id: number): UseArmadaDetailReturn {
  const [data, setData] = useState<ArmadaDetail | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [completeness_pct, setCompleteness] = useState(100);
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data awal
  useEffect(() => {
    if (!trip_id) return;
    armadaAPI.detail(trip_id)
      .then((res) => {
        const d = res.data;
        setData(d);
        setPackages(d.packages);
        setAlerts(d.alerts_aktif);
        setCompleteness(d.completeness_pct ?? 100);
        if (d.latitude && d.longitude) {
          setPosition({ lat: d.latitude, lon: d.longitude });
        }
      })
      .catch((err: Error) => setError(err.message ?? 'Trip tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [trip_id]);

  // WebSocket real-time
  useEffect(() => {
    if (!trip_id) return;

    const handleTelemetry = (payload: TelemetryUpdatePayload) => {
      setLastUpdate(payload.timestamp);
      setCompleteness(payload.completeness_pct);
      // gps null (belum fix) → pertahankan posisi terakhir, tetap update Ck
      if (payload.gps) setPosition({ lat: payload.gps.lat, lon: payload.gps.lon });
      setData((prev) =>
        prev
          ? {
              ...prev,
              completeness_pct: payload.completeness_pct,
              latitude: payload.gps ? payload.gps.lat : prev.latitude,
              longitude: payload.gps ? payload.gps.lon : prev.longitude,
              ringkasan: {
                ...prev.ringkasan,
                terdeteksi: payload.terdeteksi,
                total_paket: payload.total_paket,
              },
            }
          : prev
      );
    };

    const handleAlert = (payload: PaketHilangPayload) => {
      // Tambah alert baru ke list
      setAlerts((prev) => [
        {
          id: payload.alert.id,
          jenis_alert: payload.alert.jenis_alert,
          deskripsi: payload.alert.deskripsi,
          status_alert: payload.alert.status_alert,
          timestamp: payload.alert.timestamp,
          kode_paket: payload.alert.kode_paket ?? '',
        },
        ...prev,
      ]);

      // Tandai paket yang hilang dengan is_detected: false
      if (payload.alert.kode_paket) {
        setPackages((prev) =>
          prev.map((p) =>
            p.kode_paket === payload.alert.kode_paket
              ? { ...p, is_detected: false }
              : p
          )
        );
      }
    };

    const cleanup = subscribeTrip(trip_id, handleTelemetry, handleAlert);
    return cleanup;
  }, [trip_id]);

  return { data, packages, alerts, completeness_pct, lastUpdate, loading, error, position };
}
