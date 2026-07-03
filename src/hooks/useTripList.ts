// src/hooks/useTripList.ts
// Fetch list trip — untuk /riwayat (admin, filter selesai) dan /driver/dashboard (trip aktif driver)

import { useEffect, useState } from 'react';
import { tripAPI, type TripItem } from '@/lib/api';

type TripFilter = 'all' | 'berjalan' | 'selesai' | 'persiapan';

interface UseTripListReturn {
  trips: TripItem[];
  loading: boolean;
  error: string;
  /** Refresh manual */
  refetch: () => void;
}

export function useTripList(filter: TripFilter = 'all'): UseTripListReturn {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    setLoading(true);
    tripAPI.list()
      .then((res) => {
        const filtered =
          filter === 'all'
            ? res.data
            : res.data.filter((t) => t.status_trip === filter);
        setTrips(filtered);
      })
      .catch((err: Error) => setError(err.message ?? 'Gagal memuat data trip.'))
      .finally(() => setLoading(false));
  }, [filter, tick]);

  return { trips, loading, error, refetch };
}
