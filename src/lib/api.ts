// src/lib/api.ts
// Centralized API client untuk semua request ke backend VTS Logistik

import { MOCK_ARMADA_LIST, getMockArmadaDetail, getMockManifestDetail, MOCK_MANIFEST_LIST, getMockTrackingResult } from './mockData';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ─── Helper: ambil token dari localStorage ────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vts_token');
}

// ─── Base fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Respons bisa saja bukan JSON (mis. 502 dari proxy) — jangan crash saat parse
  let data: { message?: string } & T;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new Error(`Request gagal: ${res.status} ${res.statusText}`);
    throw new Error('Respons server tidak valid');
  }

  if (!res.ok) {
    throw new Error(data.message ?? `Request gagal: ${res.status}`);
  }

  return data as T;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Auth
export interface UserData {
  id: number;
  nama: string;
  email: string;
  role: 'admin' | 'driver';
  nomor_sim?: string;
  no_telepon?: string;
}

export interface LoginResponse {
  token: string;
  user: UserData;
}

// Armada
export interface ArmadaItem {
  trip_id: number;
  rute_asal: string;
  rute_tujuan: string;
  waktu_berangkat: string;
  status_trip: string;
  truck_id: number;
  kode_truk: string;
  nomor_polisi: string;
  jenis_kendaraan: string;
  nama_driver: string;
  no_telepon: string;
  kode_manifest: string;
  total_paket: number;
  latitude: number | null;
  longitude: number | null;
  kecepatan_kmh: number | null;
  waktu_posisi: string | null;
  completeness_pct: number | null;
}

export interface PackageItem {
  id: number;
  rfid_tag_epc: string;
  kode_paket: string;
  nama_pengirim?: string;
  kontak_pengirim?: string;
  nama_penerima: string;
  kontak_penerima?: string;
  alamat_asal?: string;
  alamat_tujuan: string;
  berat_kg: number;
  status_paket: string;
  is_detected: boolean | null;
  waktu_cek: string | null;
  last_lat?: number | null;
  last_lon?: number | null;
}

export interface AlertItem {
  id: number;
  jenis_alert: string;
  deskripsi: string;
  status_alert: string;
  timestamp: string;
  kode_paket: string;
}

export interface ArmadaDetail {
  trip_id: number;
  kode_truk: string;
  nomor_polisi: string;
  jenis_kendaraan?: string;
  nama_driver: string;
  kode_manifest: string;
  rute_asal: string;
  rute_tujuan: string;
  status_trip: string;
  waktu_berangkat: string;
  waktu_selesai: string | null;
  completeness_pct: number | null;
  latitude: number | null;
  longitude: number | null;
  waktu_posisi: string | null;
  ringkasan: {
    total_paket: number;
    terdeteksi: number;
    hilang: number;
  };
  packages: PackageItem[];
  alerts_aktif: AlertItem[];
}

// Manifest
export interface ManifestItem {
  id: number;
  kode_manifest: string;
  tanggal_dibuat: string;
  status: string;
  jumlah_paket: number;
  nama_pembuat?: string;
}

export interface ManifestArmada {
  trip_id: number;
  status_trip: string;
  rute_asal: string;
  rute_tujuan: string;
  kode_truk: string;
  nomor_polisi: string;
  jenis_kendaraan: string;
  nama_driver: string;
}

export interface ManifestDetail extends ManifestItem {
  packages: PackageItem[];
  /** Trip/armada yang ditugaskan ke manifest ini, null jika belum di-assign */
  armada?: ManifestArmada | null;
}

export interface CreateManifestBody {
  kode_manifest: string;
  packages: Array<{
    rfid_tag_epc: string;
    kode_paket: string;
    nama_pengirim: string;
    nama_penerima: string;
    alamat_tujuan: string;
    berat_kg: number;
  }>;
}

// Trip
export interface TripItem {
  id: number;
  rute_asal: string;
  rute_tujuan: string;
  waktu_berangkat: string | null;
  waktu_selesai: string | null;
  status_trip: 'persiapan' | 'berjalan' | 'selesai';
  created_at: string;
  kode_truk: string;
  nomor_polisi: string;
  nama_driver: string;
  kode_manifest: string;
  jumlah_paket: number;
}

export interface TripHistory {
  gps_track: Array<{
    latitude: number;
    longitude: number;
    kecepatan_kmh: number | null;
    timestamp: string;
  }>;
  alerts: Array<{
    jenis_alert: string;
    deskripsi: string;
    status_alert: string;
    timestamp: string;
    kode_paket: string;
    rfid_tag_epc: string;
    alert_lat: number | null;
    alert_lon: number | null;
  }>;
  package_detections: Array<{
    package_id: number;
    kode_paket: string;
    events: Array<{
      is_detected: boolean;
      timestamp: string;
    }>;
  }>;
}

export interface PackageTrace {
  package: {
    id: number;
    kode_paket: string;
    rfid_tag_epc: string;
    nama_pengirim: string;
    nama_penerima: string;
    alamat_tujuan: string;
    berat_kg: number;
    status_paket: string;
  };
  trace: Array<{
    latitude: number;
    longitude: number;
    is_detected: boolean;
    timestamp: string;
  }>;
}

export interface TripDetail {
  id: number;
  rute_asal: string;
  rute_tujuan: string;
  waktu_berangkat: string | null;
  waktu_selesai: string | null;
  status_trip: string;
  created_at: string;
  kode_truk: string;
  nomor_polisi: string;
  jenis_kendaraan: string;
  nama_driver: string;
  kode_manifest: string;
  packages: Array<{
    id: number;
    kode_paket: string;
    rfid_tag_epc: string;
    nama_pengirim: string;
    nama_penerima: string;
    alamat_tujuan: string;
    berat_kg: number;
    status_paket: string;
  }>;
}

export interface CreateTripBody {
  truck_id: number;
  driver_id: number;
  manifest_id: number;
  rute_asal: string;
  rute_tujuan: string;
}

// Admin referensi
export interface TruckOption {
  id: number;
  kode_truk: string;
  nomor_polisi: string;
  jenis_kendaraan: string;
  status: string;
  trip_aktif: number;
}

export interface DriverOption {
  id: number;
  nama: string;
  email: string;
  no_telepon: string;
  trip_aktif: number;
}

// Tracking publik
export interface TrackingResult {
  kode_paket: string;
  nama_penerima: string;
  alamat_tujuan: string;
  status_paket: string;
  sedang_dalam_perjalanan: boolean;
  perjalanan_selesai?: boolean;
  waktu_selesai?: string | null;
  rute?: { dari: string; ke: string };
  kendaraan?: { kode_truk: string; nomor_polisi: string };
  posisi_kendaraan?: {
    latitude: number;
    longitude: number;
    kecepatan_kmh: number | null;
    timestamp: string;
  } | null;
  status_rfid?: {
    terdeteksi: boolean;
    waktu: string;
    terakhir_terdeteksi?: string | null;
  } | null;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<ApiResponse<LoginResponse>>('/api/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    }),

  register: (body: {
    nama: string;
    email: string;
    password: string;
    role: 'admin' | 'driver';
    nomor_sim?: string;
    no_telepon?: string;
  }) =>
    apiRequest<ApiResponse<UserData>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () =>
    apiRequest<ApiResponse<UserData>>('/api/auth/me'),
};

// ─── Armada API ───────────────────────────────────────────────────────────────

export interface DeviceStatusItem {
  id: string;
  online: boolean;
  gps_fix: boolean | null;
  signal_csq: number | null;
  uptime_s: number | null;
  last_seen: string;
}

export const armadaAPI = {
  list: (): Promise<ApiResponse<ArmadaItem[]>> => {
    if (USE_MOCK) return Promise.resolve({ success: true, data: MOCK_ARMADA_LIST as unknown as ArmadaItem[] });
    return apiRequest<ApiResponse<ArmadaItem[]>>('/api/armada');
  },

  // Kondisi alat ESP32 per truk (online/gps/sinyal) — keyed by kode_truk
  deviceStatus: (): Promise<ApiResponse<Record<string, DeviceStatusItem>>> => {
    if (USE_MOCK) return Promise.resolve({ success: true, data: {} });
    return apiRequest<ApiResponse<Record<string, DeviceStatusItem>>>('/api/armada/device-status');
  },

  detail: (trip_id: number): Promise<ApiResponse<ArmadaDetail>> => {
    if (USE_MOCK) {
      const detail = getMockArmadaDetail(trip_id);
      if (!detail) return Promise.reject(new Error('Trip tidak ditemukan'));
      return Promise.resolve({ success: true, data: detail as unknown as ArmadaDetail });
    }
    return apiRequest<ApiResponse<ArmadaDetail>>(`/api/armada/${trip_id}/detail`);
  },
};

// ─── Manifest API ─────────────────────────────────────────────────────────────

export const manifestAPI = {
  list: (): Promise<ApiResponse<ManifestItem[]>> => {
    if (USE_MOCK) return Promise.resolve({ success: true, data: MOCK_MANIFEST_LIST as unknown as ManifestItem[] });
    return apiRequest<ApiResponse<ManifestItem[]>>('/api/manifests');
  },

  // GET /api/manifests/:id — detail manifest + daftar paket
  detail: (id: number): Promise<ApiResponse<ManifestDetail>> => {
    if (USE_MOCK) {
      const detail = getMockManifestDetail(id);
      if (!detail) return Promise.reject(new Error('Manifest tidak ditemukan'));
      return Promise.resolve({ success: true, data: detail as unknown as ManifestDetail });
    }
    return apiRequest<ApiResponse<ManifestDetail>>(`/api/manifests/${id}`);
  },

  // POST /api/manifests — buat manifest baru + import paket RFID
  create: (body: CreateManifestBody) =>
    apiRequest<ApiResponse<ManifestDetail>>('/api/manifests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Trip API ─────────────────────────────────────────────────────────────────

export const tripAPI = {
  // GET /api/trips — semua trip (admin: semua, driver: miliknya)
  list: () =>
    apiRequest<ApiResponse<TripItem[]>>('/api/trips'),

  // GET /api/trips/:id — detail satu trip
  getById: (id: number) =>
    apiRequest<ApiResponse<TripDetail>>(`/api/trips/${id}`),

  // GET /api/trips/:id/packages/:pkg_id/trace — jejak satu paket
  packageTrace: (trip_id: number, pkg_id: number) =>
    apiRequest<ApiResponse<PackageTrace>>(`/api/trips/${trip_id}/packages/${pkg_id}/trace`),

  // POST /api/trips — buat trip baru
  create: (body: CreateTripBody) =>
    apiRequest<ApiResponse<TripItem>>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // PATCH /api/trips/:id/start — mulai perjalanan
  start: (id: number) =>
    apiRequest<ApiResponse<TripItem>>(`/api/trips/${id}/start`, {
      method: 'PATCH',
    }),

  // PATCH /api/trips/:id/finish — selesaikan perjalanan
  finish: (id: number) =>
    apiRequest<ApiResponse<TripItem>>(`/api/trips/${id}/finish`, {
      method: 'PATCH',
    }),

  // GET /api/trips/:id/history — riwayat GPS + alert selama trip
  history: (id: number) =>
    apiRequest<ApiResponse<TripHistory>>(`/api/trips/${id}/history`),
};

// ─── Admin referensi API ──────────────────────────────────────────────────────

export const adminAPI = {
  trucks: () => apiRequest<ApiResponse<TruckOption[]>>('/api/admin/trucks'),
  drivers: () => apiRequest<ApiResponse<DriverOption[]>>('/api/admin/drivers'),
};

// ─── Tracking publik API ──────────────────────────────────────────────────────

export const trackingAPI = {
  getByKode: (kode_paket: string): Promise<ApiResponse<TrackingResult>> => {
    if (USE_MOCK) {
      const result = getMockTrackingResult(kode_paket);
      if (!result) return Promise.reject(new Error('Paket tidak ditemukan'));
      return Promise.resolve({ success: true, data: result as unknown as TrackingResult });
    }
    return apiRequest<ApiResponse<TrackingResult>>(`/api/tracking/${kode_paket}`, {
      skipAuth: true,
    });
  },
};
