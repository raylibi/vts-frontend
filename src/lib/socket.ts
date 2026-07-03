// src/lib/socket.ts
// Socket.io client singleton untuk koneksi WebSocket ke backend VTS Logistik

import { io, Socket } from 'socket.io-client';

// ─── Event payload types (mirror dari backend) ────────────────────────────────

export interface TelemetryUpdatePayload {
  trip_id: number;
  kode_truk: string;
  timestamp: string;
  gps: { lat: number; lon: number };
  completeness_pct: number;
  terdeteksi: number;
  total_paket: number;
}

export interface PaketHilangPayload {
  trip_id: number;
  kode_truk: string;
  alert: {
    id: number;
    jenis_alert: string;
    deskripsi: string;
    status_alert: string;
    timestamp: string;
    kode_paket?: string;
    rfid_tag_epc?: string;
    lokasi?: { lat: number; lon: number };
  };
}

export interface PaketDitemukanPayload {
  trip_id: number;
  kode_truk: string;
  alert_id: number;
  kode_paket: string;
}

export interface TripFinishedPayload {
  trip_id: number;
}

// ─── Typed server → client events ────────────────────────────────────────────

interface ServerToClientEvents {
  telemetry_update: (payload: TelemetryUpdatePayload) => void;
  paket_hilang: (payload: PaketHilangPayload) => void;
  paket_ditemukan: (payload: PaketDitemukanPayload) => void;
  trip_finished: (payload: TripFinishedPayload) => void;
}

// ─── Typed client → server events ────────────────────────────────────────────

interface ClientToServerEvents {
  join_trip: (payload: { trip_id: number }) => void;
  leave_trip: (payload: { trip_id: number }) => void;
  track_package: (payload: { kode_paket: string }) => void;
}

export type VTSSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ─── Singleton instance ───────────────────────────────────────────────────────

let socketInstance: VTSSocket | null = null;

/**
 * Ambil atau buat instance Socket.io.
 * Singleton: hanya ada satu koneksi per browser session.
 *
 * Contoh penggunaan di komponen:
 *   const socket = getSocket();
 *   socket.connect();
 *   socket.on('telemetry_update', handler);
 *   return () => { socket.off('telemetry_update', handler); socket.disconnect(); };
 */
export function getSocket(): VTSSocket {
  if (socketInstance) return socketInstance;

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('vts_token')
    : null;

  socketInstance = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001', {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false, // connect manual biar tidak connect di SSR
  }) as VTSSocket;

  socketInstance.on('disconnect', () => {
    console.log('[Socket] Terputus dari server');
  });

  socketInstance.on('connect_error', (err) => {
    console.error('[Socket] Gagal konek:', err.message);
  });

  return socketInstance;
}

/**
 * Hancurkan instance (pakai saat logout).
 */
export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// ─── Helper hooks-friendly functions ─────────────────────────────────────────

/**
 * Subscribe ke telemetry satu trip tertentu.
 * Otomatis emit join_trip saat dipanggil.
 * Kembalikan cleanup function untuk dipakai di useEffect return.
 */
export function subscribeTrip(
  trip_id: number,
  onTelemetry: (payload: TelemetryUpdatePayload) => void,
  onAlert: (payload: PaketHilangPayload) => void,
  onRecovered?: (payload: PaketDitemukanPayload) => void,
): () => void {
  const socket = getSocket();

  if (!socket.connected) socket.connect();

  socket.emit('join_trip', { trip_id });
  socket.on('telemetry_update', onTelemetry);
  socket.on('paket_hilang', onAlert);
  if (onRecovered) socket.on('paket_ditemukan', onRecovered);

  return () => {
    socket.emit('leave_trip', { trip_id });
    socket.off('telemetry_update', onTelemetry);
    socket.off('paket_hilang', onAlert);
    if (onRecovered) socket.off('paket_ditemukan', onRecovered);
  };
}

/**
 * Subscribe ke tracking satu paket (untuk pelanggan, tanpa auth).
 */
export function subscribePackage(
  kode_paket: string,
  onTelemetry: (payload: TelemetryUpdatePayload) => void,
  onTripFinished?: (payload: TripFinishedPayload) => void,
): () => void {
  const socket = getSocket();

  if (!socket.connected) socket.connect();

  socket.emit('track_package', { kode_paket });
  socket.on('telemetry_update', onTelemetry);
  if (onTripFinished) socket.on('trip_finished', onTripFinished);

  return () => {
    socket.off('telemetry_update', onTelemetry);
    if (onTripFinished) socket.off('trip_finished', onTripFinished);
  };
}

/**
 * Subscribe ke admin_room — backend auto-join kalau role admin.
 * Cukup connect dengan token admin, tidak perlu emit event tambahan.
 */
export function connectAsAdmin(
  onTelemetry: (payload: TelemetryUpdatePayload) => void,
  onAlert: (payload: PaketHilangPayload) => void,
): () => void {
  const socket = getSocket();

  if (!socket.connected) socket.connect();

  socket.on('telemetry_update', onTelemetry);
  socket.on('paket_hilang', onAlert);

  return () => {
    socket.off('telemetry_update', onTelemetry);
    socket.off('paket_hilang', onAlert);
    socket.disconnect();
  };
}
