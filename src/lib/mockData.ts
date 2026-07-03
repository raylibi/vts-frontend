/**
 * Mock data untuk testing dashboard VTS Logistik.
 * Aktifkan dengan: NEXT_PUBLIC_USE_MOCK=true di .env.local
 *
 * Berisi 4 truk dengan rute nyata di Bandung + simulasi GPS bergerak.
 */

// ─── Tipe internal (mirror ArmadaItem di api.ts) ──────────────────────────────

export interface MockArmadaItem {
  trip_id: number;
  kode_truk: string;
  nomor_polisi: string;
  jenis_kendaraan: string;
  nama_driver: string;
  no_telepon: string;
  kode_manifest: string;
  rute_asal: string;
  rute_tujuan: string;
  total_paket: number;
  latitude: number;
  longitude: number;
  kecepatan_kmh: number;
  completeness_pct: number;
  waktu_posisi: string;
}

export interface MockPackage {
  id: number;
  rfid_tag_epc: string;
  kode_paket: string;
  nama_pengirim: string;
  kontak_pengirim: string;
  nama_penerima: string;
  kontak_penerima: string;
  alamat_asal: string;
  alamat_tujuan: string;
  berat_kg: number;
  status_paket: string;
}

// ─── Rute GPS di Bandung (lat, lon) ──────────────────────────────────────────

// Interpolasi linier antara dua titik dengan N langkah
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function interpolateRoute(
  waypoints: Array<{ lat: number; lon: number }>,
  steps: number,
): Array<{ lat: number; lon: number }> {
  const result: Array<{ lat: number; lon: number }> = [];
  const segments = waypoints.length - 1;
  const stepsPerSegment = Math.floor(steps / segments);

  for (let s = 0; s < segments; s++) {
    const a = waypoints[s];
    const b = waypoints[s + 1];
    for (let i = 0; i < stepsPerSegment; i++) {
      const t = i / stepsPerSegment;
      // Tambah sedikit variasi acak agar lintasan tidak terlalu lurus
      const jitter = 0.0002;
      result.push({
        lat: lerp(a.lat, b.lat, t) + (Math.random() - 0.5) * jitter,
        lon: lerp(a.lon, b.lon, t) + (Math.random() - 0.5) * jitter,
      });
    }
  }
  result.push(waypoints[waypoints.length - 1]);
  return result;
}

// ── Rute 1: Stasiun Bandung → Cimahi (via Jl. Pasteur) ───────────────────────
const route1 = interpolateRoute([
  { lat: -6.9127, lon: 107.6021 }, // Stasiun Bandung
  { lat: -6.9050, lon: 107.5940 }, // Jl. Pasirkaliki
  { lat: -6.8980, lon: 107.5820 }, // Jl. Pasteur
  { lat: -6.8910, lon: 107.5670 }, // Masuk Cimahi
  { lat: -6.8830, lon: 107.5430 }, // Cimahi Tengah
], 60);

// ── Rute 2: Balai Kota Bandung → Lembang (via Jl. Setiabudi) ─────────────────
const route2 = interpolateRoute([
  { lat: -6.9067, lon: 107.6133 }, // Balai Kota Bandung
  { lat: -6.8950, lon: 107.6150 }, // Jl. Cipaganti
  { lat: -6.8750, lon: 107.6160 }, // Jl. Setiabudi bawah
  { lat: -6.8500, lon: 107.6170 }, // Dago Atas
  { lat: -6.8300, lon: 107.6173 }, // Menuju Lembang
  { lat: -6.8128, lon: 107.6174 }, // Lembang
], 60);

// ── Rute 3: Tegallega → Soreang (via Jl. Kopo) ───────────────────────────────
const route3 = interpolateRoute([
  { lat: -6.9333, lon: 107.5926 }, // Tegallega
  { lat: -6.9500, lon: 107.5850 }, // Jl. Kopo
  { lat: -6.9700, lon: 107.5700 }, // Margahayu
  { lat: -6.9950, lon: 107.5500 }, // Katapang
  { lat: -7.0200, lon: 107.5350 }, // Soreang utara
  { lat: -7.0368, lon: 107.5201 }, // Soreang
], 60);

// ── Rute 4: Gedebage → Majalaya (via Jl. Soekarno-Hatta timur) ───────────────
const route4 = interpolateRoute([
  { lat: -6.9400, lon: 107.6800 }, // Gedebage
  { lat: -6.9550, lon: 107.7000 }, // Buahbatu timur
  { lat: -6.9800, lon: 107.7200 }, // Bojongsoang
  { lat: -7.0100, lon: 107.7400 }, // Baleendah
  { lat: -7.0300, lon: 107.7500 }, // Menuju Majalaya
  { lat: -7.0492, lon: 107.7593 }, // Majalaya
], 60);

// ─── Daftar Paket per Manifest ────────────────────────────────────────────────

export const mockPackages: Record<string, MockPackage[]> = {
  'MNF-2025-001': [
    { id: 1,  rfid_tag_epc: 'RFID-A001', kode_paket: 'PKT-001', nama_pengirim: 'PT. Ekspres Nusantara', kontak_pengirim: '02212340001', nama_penerima: 'Budi Santoso',    kontak_penerima: '08112340001', alamat_asal: 'Jl. Soekarno-Hatta No.10, Bandung', alamat_tujuan: 'Jl. Mawar No.5, Cimahi',       berat_kg: 2.5, status_paket: 'dikirim' },
    { id: 2,  rfid_tag_epc: 'RFID-A002', kode_paket: 'PKT-002', nama_pengirim: 'PT. Ekspres Nusantara', kontak_pengirim: '02212340001', nama_penerima: 'Siti Rahayu',     kontak_penerima: '08112340002', alamat_asal: 'Jl. Soekarno-Hatta No.10, Bandung', alamat_tujuan: 'Jl. Melati No.12, Cimahi',     berat_kg: 1.2, status_paket: 'dikirim' },
    { id: 3,  rfid_tag_epc: 'RFID-A003', kode_paket: 'PKT-003', nama_pengirim: 'PT. Ekspres Nusantara', kontak_pengirim: '02212340001', nama_penerima: 'Ahmad Fauzi',     kontak_penerima: '08112340003', alamat_asal: 'Jl. Soekarno-Hatta No.10, Bandung', alamat_tujuan: 'Jl. Dahlia No.7, Cimahi',      berat_kg: 3.0, status_paket: 'dikirim' },
    { id: 4,  rfid_tag_epc: 'RFID-A004', kode_paket: 'PKT-004', nama_pengirim: 'PT. Ekspres Nusantara', kontak_pengirim: '02212340001', nama_penerima: 'Dewi Lestari',    kontak_penerima: '08112340004', alamat_asal: 'Jl. Soekarno-Hatta No.10, Bandung', alamat_tujuan: 'Jl. Flamboyan No.3, Cimahi',   berat_kg: 0.8, status_paket: 'dikirim' },
    { id: 5,  rfid_tag_epc: 'RFID-A005', kode_paket: 'PKT-005', nama_pengirim: 'PT. Ekspres Nusantara', kontak_pengirim: '02212340001', nama_penerima: 'Rudi Hermawan',   kontak_penerima: '08112340005', alamat_asal: 'Jl. Soekarno-Hatta No.10, Bandung', alamat_tujuan: 'Jl. Kenanga No.9, Cimahi',     berat_kg: 5.0, status_paket: 'dikirim' },
  ],
  'MNF-2025-002': [
    { id: 6,  rfid_tag_epc: 'RFID-B001', kode_paket: 'PKT-006', nama_pengirim: 'CV. Maju Bersama',       kontak_pengirim: '02212340002', nama_penerima: 'Rina Wati',       kontak_penerima: '08112340006', alamat_asal: 'Jl. Asia Afrika No.8, Bandung',     alamat_tujuan: 'Jl. Cihanjuang No.8, Lembang', berat_kg: 2.0, status_paket: 'dikirim' },
    { id: 7,  rfid_tag_epc: 'RFID-B002', kode_paket: 'PKT-007', nama_pengirim: 'CV. Maju Bersama',       kontak_pengirim: '02212340002', nama_penerima: 'Doni Kusuma',     kontak_penerima: '08112340007', alamat_asal: 'Jl. Asia Afrika No.8, Bandung',     alamat_tujuan: 'Jl. Grand Hotel No.2, Lembang', berat_kg: 4.5, status_paket: 'dikirim' },
    { id: 8,  rfid_tag_epc: 'RFID-B003', kode_paket: 'PKT-008', nama_pengirim: 'CV. Maju Bersama',       kontak_pengirim: '02212340002', nama_penerima: 'Maya Sari',       kontak_penerima: '08112340008', alamat_asal: 'Jl. Asia Afrika No.8, Bandung',     alamat_tujuan: 'Jl. Raya Lembang No.15',        berat_kg: 1.5, status_paket: 'dikirim' },
  ],
  'MNF-2025-003': [
    { id: 9,  rfid_tag_epc: 'RFID-C001', kode_paket: 'PKT-009', nama_pengirim: 'UD. Sumber Rejeki',      kontak_pengirim: '02212340003', nama_penerima: 'Hendra Wijaya',   kontak_penerima: '08112340009', alamat_asal: 'Jl. Otto Iskandar No.3, Tegallega', alamat_tujuan: 'Jl. Raya Soreang No.4',         berat_kg: 3.2, status_paket: 'dikirim' },
    { id: 10, rfid_tag_epc: 'RFID-C002', kode_paket: 'PKT-010', nama_pengirim: 'UD. Sumber Rejeki',      kontak_pengirim: '02212340003', nama_penerima: 'Fitri Handayani', kontak_penerima: '08112340010', alamat_asal: 'Jl. Otto Iskandar No.3, Tegallega', alamat_tujuan: 'Jl. Pamekaran No.6, Soreang',   berat_kg: 2.8, status_paket: 'dikirim' },
    { id: 11, rfid_tag_epc: 'RFID-C003', kode_paket: 'PKT-011', nama_pengirim: 'UD. Sumber Rejeki',      kontak_pengirim: '02212340003', nama_penerima: 'Agus Prasetyo',   kontak_penerima: '08112340011', alamat_asal: 'Jl. Otto Iskandar No.3, Tegallega', alamat_tujuan: 'Jl. Kutawaringin No.11',         berat_kg: 1.0, status_paket: 'dikirim' },
    { id: 12, rfid_tag_epc: 'RFID-C004', kode_paket: 'PKT-012', nama_pengirim: 'UD. Sumber Rejeki',      kontak_pengirim: '02212340003', nama_penerima: 'Lia Permata',     kontak_penerima: '08112340012', alamat_asal: 'Jl. Otto Iskandar No.3, Tegallega', alamat_tujuan: 'Jl. Cilampeni No.3, Soreang',   berat_kg: 6.0, status_paket: 'dikirim' },
  ],
  'MNF-2025-004': [
    { id: 13, rfid_tag_epc: 'RFID-D001', kode_paket: 'PKT-013', nama_pengirim: 'PT. Gedebage Logistik',  kontak_pengirim: '02212340004', nama_penerima: 'Bambang Irawan',  kontak_penerima: '08112340013', alamat_asal: 'Jl. Gedebage Selatan No.5, Bandung', alamat_tujuan: 'Jl. Raya Majalaya No.7',        berat_kg: 2.2, status_paket: 'dikirim' },
    { id: 14, rfid_tag_epc: 'RFID-D002', kode_paket: 'PKT-014', nama_pengirim: 'PT. Gedebage Logistik',  kontak_pengirim: '02212340004', nama_penerima: 'Nurul Hidayah',   kontak_penerima: '08112340014', alamat_asal: 'Jl. Gedebage Selatan No.5, Bandung', alamat_tujuan: 'Jl. Baleendah No.9',            berat_kg: 3.5, status_paket: 'dikirim' },
    { id: 15, rfid_tag_epc: 'RFID-D003', kode_paket: 'PKT-015', nama_pengirim: 'PT. Gedebage Logistik',  kontak_pengirim: '02212340004', nama_penerima: 'Teguh Santosa',   kontak_penerima: '08112340015', alamat_asal: 'Jl. Gedebage Selatan No.5, Bandung', alamat_tujuan: 'Jl. Majalaya Baru No.2',        berat_kg: 0.6, status_paket: 'dikirim' },
    { id: 16, rfid_tag_epc: 'RFID-D004', kode_paket: 'PKT-016', nama_pengirim: 'PT. Gedebage Logistik',  kontak_pengirim: '02212340004', nama_penerima: 'Sri Mulyani',     kontak_penerima: '08112340016', alamat_asal: 'Jl. Gedebage Selatan No.5, Bandung', alamat_tujuan: 'Jl. Ciparay No.5, Majalaya',    berat_kg: 4.1, status_paket: 'dikirim' },
    { id: 17, rfid_tag_epc: 'RFID-D005', kode_paket: 'PKT-017', nama_pengirim: 'PT. Gedebage Logistik',  kontak_pengirim: '02212340004', nama_penerima: 'Yusuf Hakim',     kontak_penerima: '08112340017', alamat_asal: 'Jl. Gedebage Selatan No.5, Bandung', alamat_tujuan: 'Jl. Industri No.1, Majalaya',    berat_kg: 7.0, status_paket: 'dikirim' },
    { id: 18, rfid_tag_epc: 'RFID-D006', kode_paket: 'PKT-018', nama_pengirim: 'PT. Gedebage Logistik',  kontak_pengirim: '02212340004', nama_penerima: 'Anita Rahma',     kontak_penerima: '08112340018', alamat_asal: 'Jl. Gedebage Selatan No.5, Bandung', alamat_tujuan: 'Jl. Solokan Jeruk No.8',         berat_kg: 1.8, status_paket: 'dikirim' },
  ],
};

// ─── Data truk + state simulasi ───────────────────────────────────────────────

interface TruckState {
  data: MockArmadaItem;
  route: Array<{ lat: number; lon: number }>;
  step: number;
}

// step awal berbeda agar truk tidak mulai di posisi yang sama
const INITIAL_STEPS = [0, 15, 30, 45];

// ─── Statis mock data untuk halaman /armada dan /manifest ────────────────────

const MOCK_WAKTU_BERANGKAT = '2025-05-28T06:00:00.000Z';

export const MOCK_ARMADA_LIST = [
  {
    trip_id: 1, truck_id: 1,
    kode_truk: 'TRK-001', nomor_polisi: 'D 1234 AB', jenis_kendaraan: 'Box Truck',
    nama_driver: 'Eko Susanto', no_telepon: '08111234001',
    kode_manifest: 'MNF-2025-001', rute_asal: 'Stasiun Bandung', rute_tujuan: 'Cimahi',
    total_paket: mockPackages['MNF-2025-001'].length,
    latitude: route1[INITIAL_STEPS[0]].lat, longitude: route1[INITIAL_STEPS[0]].lon,
    kecepatan_kmh: 42, completeness_pct: 100,
    waktu_posisi: MOCK_WAKTU_BERANGKAT, waktu_berangkat: MOCK_WAKTU_BERANGKAT, status_trip: 'berjalan',
  },
  {
    trip_id: 2, truck_id: 2,
    kode_truk: 'TRK-002', nomor_polisi: 'D 5678 CD', jenis_kendaraan: 'Pickup',
    nama_driver: 'Dimas Pratama', no_telepon: '08111234002',
    kode_manifest: 'MNF-2025-002', rute_asal: 'Balai Kota Bandung', rute_tujuan: 'Lembang',
    total_paket: mockPackages['MNF-2025-002'].length,
    latitude: route2[INITIAL_STEPS[1]].lat, longitude: route2[INITIAL_STEPS[1]].lon,
    kecepatan_kmh: 38, completeness_pct: 100,
    waktu_posisi: MOCK_WAKTU_BERANGKAT, waktu_berangkat: MOCK_WAKTU_BERANGKAT, status_trip: 'berjalan',
  },
  {
    trip_id: 3, truck_id: 3,
    kode_truk: 'TRK-003', nomor_polisi: 'D 9012 EF', jenis_kendaraan: 'Box Truck',
    nama_driver: 'Fajar Nugroho', no_telepon: '08111234003',
    kode_manifest: 'MNF-2025-003', rute_asal: 'Tegallega', rute_tujuan: 'Soreang',
    total_paket: mockPackages['MNF-2025-003'].length,
    latitude: route3[INITIAL_STEPS[2]].lat, longitude: route3[INITIAL_STEPS[2]].lon,
    kecepatan_kmh: 55, completeness_pct: 75,
    waktu_posisi: MOCK_WAKTU_BERANGKAT, waktu_berangkat: MOCK_WAKTU_BERANGKAT, status_trip: 'berjalan',
  },
  {
    trip_id: 4, truck_id: 4,
    kode_truk: 'TRK-004', nomor_polisi: 'D 3456 GH', jenis_kendaraan: 'Van',
    nama_driver: 'Rizky Ardiansyah', no_telepon: '08111234004',
    kode_manifest: 'MNF-2025-004', rute_asal: 'Gedebage', rute_tujuan: 'Majalaya',
    total_paket: mockPackages['MNF-2025-004'].length,
    latitude: route4[INITIAL_STEPS[3]].lat, longitude: route4[INITIAL_STEPS[3]].lon,
    kecepatan_kmh: 61, completeness_pct: 100,
    waktu_posisi: MOCK_WAKTU_BERANGKAT, waktu_berangkat: MOCK_WAKTU_BERANGKAT, status_trip: 'berjalan',
  },
];

export const MOCK_MANIFEST_LIST = [
  { id: 1, kode_manifest: 'MNF-2025-001', tanggal_dibuat: MOCK_WAKTU_BERANGKAT, status: 'aktif', jumlah_paket: mockPackages['MNF-2025-001'].length, nama_pembuat: 'Admin VTS' },
  { id: 2, kode_manifest: 'MNF-2025-002', tanggal_dibuat: MOCK_WAKTU_BERANGKAT, status: 'aktif', jumlah_paket: mockPackages['MNF-2025-002'].length, nama_pembuat: 'Admin VTS' },
  { id: 3, kode_manifest: 'MNF-2025-003', tanggal_dibuat: MOCK_WAKTU_BERANGKAT, status: 'aktif', jumlah_paket: mockPackages['MNF-2025-003'].length, nama_pembuat: 'Admin VTS' },
  { id: 4, kode_manifest: 'MNF-2025-004', tanggal_dibuat: MOCK_WAKTU_BERANGKAT, status: 'aktif', jumlah_paket: mockPackages['MNF-2025-004'].length, nama_pembuat: 'Admin VTS' },
];

// Koordinat terakhir diketahui untuk paket yang hilang, per trip_id
// Posisi ini sedikit di belakang posisi truk saat ini di sepanjang rute
const LOST_PACKAGE_LAST_POS: Record<number, { last_lat: number; last_lon: number }> = {
  3: { last_lat: -6.9700, last_lon: 107.5700 }, // TRK-003 — PKT-012 hilang di Margahayu
};

export function getMockTrackingResult(kode_paket: string) {
  // Cari paket di semua manifest
  let foundPkg: MockPackage | null = null;
  let foundManifest: string | null = null;

  for (const [kode_manifest, pkgs] of Object.entries(mockPackages)) {
    const pkg = pkgs.find((p) => p.kode_paket === kode_paket);
    if (pkg) { foundPkg = pkg; foundManifest = kode_manifest; break; }
  }
  if (!foundPkg || !foundManifest) return null;

  const truck = MOCK_ARMADA_LIST.find((t) => t.kode_manifest === foundManifest);
  if (!truck) return null;

  // PKT terakhir di MNF-2025-003 (TRK-003) sengaja tidak terdeteksi
  const pkgs = mockPackages[foundManifest];
  const pkgIdx = pkgs.findIndex((p) => p.kode_paket === kode_paket);
  const is_detected = !(truck.completeness_pct < 100 && pkgIdx === pkgs.length - 1);

  // Untuk paket hilang, tampilkan koordinat terakhir paket terdeteksi (bukan posisi truk saat ini)
  const lastPos = !is_detected ? LOST_PACKAGE_LAST_POS[truck.trip_id] : null;

  return {
    kode_paket: foundPkg.kode_paket,
    nama_penerima: foundPkg.nama_penerima,
    alamat_tujuan: foundPkg.alamat_tujuan,
    status_paket: foundPkg.status_paket,
    sedang_dalam_perjalanan: true,
    rute: { dari: truck.rute_asal, ke: truck.rute_tujuan },
    kendaraan: { kode_truk: truck.kode_truk, nomor_polisi: truck.nomor_polisi },
    posisi_kendaraan: {
      latitude: lastPos ? lastPos.last_lat : truck.latitude,
      longitude: lastPos ? lastPos.last_lon : truck.longitude,
      kecepatan_kmh: truck.kecepatan_kmh,
      timestamp: truck.waktu_posisi,
    },
    status_rfid: { terdeteksi: is_detected, waktu: MOCK_WAKTU_BERANGKAT },
  };
}

export function getMockManifestDetail(id: number) {
  const manifest = MOCK_MANIFEST_LIST.find(m => m.id === id);
  if (!manifest) return null;

  const rawPkgs = mockPackages[manifest.kode_manifest] ?? [];
  const packages = rawPkgs.map(p => ({
    ...p,
    is_detected: true as boolean | null,
    waktu_cek: MOCK_WAKTU_BERANGKAT as string | null,
  }));

  return { ...manifest, packages };
}

export function getMockArmadaDetail(trip_id: number) {
  const truck = MOCK_ARMADA_LIST.find((t) => t.trip_id === trip_id);
  if (!truck) return null;

  const rawPkgs = mockPackages[truck.kode_manifest] ?? [];
  const packages = rawPkgs.map((p, i) => {
    const isLost = truck.completeness_pct < 100 && i === rawPkgs.length - 1;
    const lostPos = isLost ? (LOST_PACKAGE_LAST_POS[truck.trip_id] ?? null) : null;
    return {
      ...p,
      is_detected: (isLost ? false : true) as boolean | null,
      waktu_cek: MOCK_WAKTU_BERANGKAT as string | null,
      last_lat: lostPos ? lostPos.last_lat : null,
      last_lon: lostPos ? lostPos.last_lon : null,
    };
  });

  const terdeteksi = packages.filter((p) => p.is_detected !== false).length;
  const hilang = packages.filter((p) => p.is_detected === false).length;

  return {
    trip_id: truck.trip_id,
    kode_truk: truck.kode_truk,
    nomor_polisi: truck.nomor_polisi,
    jenis_kendaraan: truck.jenis_kendaraan,
    nama_driver: truck.nama_driver,
    kode_manifest: truck.kode_manifest,
    rute_asal: truck.rute_asal,
    rute_tujuan: truck.rute_tujuan,
    status_trip: truck.status_trip,
    waktu_berangkat: truck.waktu_berangkat,
    waktu_selesai: null as string | null,
    completeness_pct: truck.completeness_pct as number | null,
    latitude: truck.latitude as number | null,
    longitude: truck.longitude as number | null,
    waktu_posisi: truck.waktu_posisi as string | null,
    ringkasan: { total_paket: truck.total_paket, terdeteksi, hilang },
    packages,
    alerts_aktif: packages
      .filter((p) => p.is_detected === false)
      .map((p) => ({
        id: p.id,
        jenis_alert: 'paket_hilang',
        deskripsi: `Paket ${p.kode_paket} tidak terdeteksi oleh RFID reader`,
        status_alert: 'baru',
        timestamp: MOCK_WAKTU_BERANGKAT,
        kode_paket: p.kode_paket,
      })),
  };
}

export function createMockTrucks(): TruckState[] {
  const now = new Date().toISOString();
  return [
    {
      step: INITIAL_STEPS[0],
      route: route1,
      data: {
        trip_id: 1,
        kode_truk: 'TRK-001',
        nomor_polisi: 'D 1234 AB',
        jenis_kendaraan: 'Box Truck',
        nama_driver: 'Eko Susanto',
        no_telepon: '08111234001',
        kode_manifest: 'MNF-2025-001',
        rute_asal: 'Stasiun Bandung',
        rute_tujuan: 'Cimahi',
        total_paket: mockPackages['MNF-2025-001'].length,
        completeness_pct: 100,
        kecepatan_kmh: 42,
        latitude: route1[INITIAL_STEPS[0]].lat,
        longitude: route1[INITIAL_STEPS[0]].lon,
        waktu_posisi: now,
      },
    },
    {
      step: INITIAL_STEPS[1],
      route: route2,
      data: {
        trip_id: 2,
        kode_truk: 'TRK-002',
        nomor_polisi: 'D 5678 CD',
        jenis_kendaraan: 'Pickup',
        nama_driver: 'Dimas Pratama',
        no_telepon: '08111234002',
        kode_manifest: 'MNF-2025-002',
        rute_asal: 'Balai Kota Bandung',
        rute_tujuan: 'Lembang',
        total_paket: mockPackages['MNF-2025-002'].length,
        completeness_pct: 100,
        kecepatan_kmh: 38,
        latitude: route2[INITIAL_STEPS[1]].lat,
        longitude: route2[INITIAL_STEPS[1]].lon,
        waktu_posisi: now,
      },
    },
    {
      step: INITIAL_STEPS[2],
      route: route3,
      data: {
        trip_id: 3,
        kode_truk: 'TRK-003',
        nomor_polisi: 'D 9012 EF',
        jenis_kendaraan: 'Box Truck',
        nama_driver: 'Fajar Nugroho',
        no_telepon: '08111234003',
        kode_manifest: 'MNF-2025-003',
        rute_asal: 'Tegallega',
        rute_tujuan: 'Soreang',
        total_paket: mockPackages['MNF-2025-003'].length,
        completeness_pct: 75, // sengaja ada warning
        kecepatan_kmh: 55,
        latitude: route3[INITIAL_STEPS[2]].lat,
        longitude: route3[INITIAL_STEPS[2]].lon,
        waktu_posisi: now,
      },
    },
    {
      step: INITIAL_STEPS[3],
      route: route4,
      data: {
        trip_id: 4,
        kode_truk: 'TRK-004',
        nomor_polisi: 'D 3456 GH',
        jenis_kendaraan: 'Van',
        nama_driver: 'Rizky Ardiansyah',
        no_telepon: '08111234004',
        kode_manifest: 'MNF-2025-004',
        rute_asal: 'Gedebage',
        rute_tujuan: 'Majalaya',
        total_paket: mockPackages['MNF-2025-004'].length,
        completeness_pct: 100,
        kecepatan_kmh: 61,
        latitude: route4[INITIAL_STEPS[3]].lat,
        longitude: route4[INITIAL_STEPS[3]].lon,
        waktu_posisi: now,
      },
    },
  ];
}

// ─── Simulasi GPS bergerak ────────────────────────────────────────────────────

export type TelemetryCallback = (payload: {
  trip_id: number;
  kode_truk: string;
  timestamp: string;
  gps: { lat: number; lon: number };
  completeness_pct: number;
  terdeteksi: number;
  total_paket: number;
  kecepatan_kmh: number;
}) => void;

/**
 * Mulai simulasi: setiap `intervalMs` ms semua truk maju satu langkah
 * di sepanjang rute masing-masing. Ketika sampai ujung rute, mulai lagi dari awal.
 * Kembalikan fungsi stop().
 */
export function startMockSimulation(
  trucks: TruckState[],
  onTelemetry: TelemetryCallback,
  intervalMs = 1500,
): () => void {
  const id = setInterval(() => {
    trucks.forEach((t) => {
      t.step = (t.step + 1) % t.route.length;
      const pos = t.route[t.step];
      const speed = 30 + Math.random() * 40; // 30–70 km/h
      t.data.latitude = pos.lat;
      t.data.longitude = pos.lon;
      t.data.kecepatan_kmh = Math.round(speed);
      t.data.waktu_posisi = new Date().toISOString();

      onTelemetry({
        trip_id: t.data.trip_id,
        kode_truk: t.data.kode_truk,
        timestamp: t.data.waktu_posisi,
        gps: { lat: pos.lat, lon: pos.lon },
        completeness_pct: t.data.completeness_pct,
        terdeteksi: Math.round((t.data.completeness_pct / 100) * t.data.total_paket),
        total_paket: t.data.total_paket,
        kecepatan_kmh: t.data.kecepatan_kmh,
      });
    });
  }, intervalMs);

  return () => clearInterval(id);
}
