// src/hooks/useManifestList.ts
// Fetch list manifest + optional detail satu manifest

import { useEffect, useState } from 'react';
import { manifestAPI, type ManifestItem, type ManifestDetail } from '@/lib/api';

interface UseManifestListReturn {
  manifests: ManifestItem[];
  loading: boolean;
  error: string;
  refetch: () => void;
}

export function useManifestList(): UseManifestListReturn {
  const [manifests, setManifests] = useState<ManifestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    setLoading(true);
    manifestAPI.list()
      .then((res) => setManifests(res.data))
      .catch((err: Error) => setError(err.message ?? 'Gagal memuat manifest.'))
      .finally(() => setLoading(false));
  }, [tick]);

  return { manifests, loading, error, refetch };
}

interface UseManifestDetailReturn {
  manifest: ManifestDetail | null;
  loading: boolean;
  error: string;
}

export function useManifestDetail(id: number): UseManifestDetailReturn {
  const [manifest, setManifest] = useState<ManifestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    manifestAPI.detail(id)
      .then((res) => setManifest(res.data))
      .catch((err: Error) => setError(err.message ?? 'Manifest tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [id]);

  return { manifest, loading, error };
}
