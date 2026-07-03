'use client';

import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PreviewRows { telemetry: number; gps_log: number; rfid_event: number; }
interface TripEntry  { id: number; kode_truk: string; waktu_selesai: string; }
interface PreviewBucket { trips: number; trip_list: TripEntry[]; rows: PreviewRows; }
interface PreviewData {
  config: { normal_days: number; alert_days: number };
  normal:      PreviewBucket;
  with_alerts: PreviewBucket;
}

function totalRows(rows: PreviewRows) {
  return rows.telemetry + rows.gps_log + rows.rfid_event;
}

function fmtNum(n: number) {
  return n.toLocaleString('id-ID');
}

export default function SettingsPage() {
  const [normalDays, setNormalDays]   = useState(90);
  const [alertDays,  setAlertDays]    = useState(365);
  const [preview,    setPreview]      = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirm,    setConfirm]      = useState('');
  const [running,    setRunning]      = useState(false);
  const [result,     setResult]       = useState<'success' | 'error' | null>(null);
  const [resultMsg,  setResultMsg]    = useState('');

  const handlePreview = async () => {
    const token = localStorage.getItem('vts_token');
    setLoadingPreview(true);
    setPreview(null);
    setResult(null);
    setConfirm('');
    try {
      const res = await fetch(
        `${API}/api/resources/retention/preview?normal_days=${normalDays}&alert_days=${alertDays}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      const data = await res.json();
      if (data.success) setPreview(data.data);
      else throw new Error(data.message);
    } catch (err: unknown) {
      setResult('error');
      setResultMsg(err instanceof Error ? err.message : 'Gagal mengambil preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRun = async () => {
    if (confirm !== 'HAPUS') return;
    const token = localStorage.getItem('vts_token');
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/resources/retention/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ normal_days: normalDays, alert_days: alertDays }),
      });
      const data = await res.json();
      if (data.success) {
        setResult('success');
        setResultMsg('Pembersihan data berhasil dijalankan. Cek log server untuk detail.');
        setPreview(null);
        setConfirm('');
      } else {
        throw new Error(data.message);
      }
    } catch (err: unknown) {
      setResult('error');
      setResultMsg(err instanceof Error ? err.message : 'Gagal menjalankan pembersihan.');
    } finally {
      setRunning(false);
    }
  };

  const hasData = preview && (preview.normal.trips > 0 || preview.with_alerts.trips > 0);

  return (
    <AdminLayout title="Pengaturan">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Judul ── */}
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#111827' }}>Manajemen Data</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Hapus data detail perjalanan lama (telemetry, GPS log, RFID event) untuk menjaga
            performa database. Catatan perjalanan dan alert tetap disimpan.
          </p>
        </div>

        {/* ── Konfigurasi ── */}
        <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid #d1fae5' }}>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
            Kebijakan Retensi
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: '#374151' }}>
                Trip normal (tanpa paket hilang)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={7}
                  max={3650}
                  value={normalDays}
                  onChange={e => { setNormalDays(Number(e.target.value)); setPreview(null); }}
                  className="w-24 px-3 py-1.5 rounded-lg text-sm"
                  style={{ border: '1px solid #d1d5db', fontFamily: "'Space Mono', monospace", color: '#111827', outline: 'none' }}
                />
                <span className="text-sm" style={{ color: '#6b7280' }}>hari</span>
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: '#374151' }}>
                Trip dengan paket hilang
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={30}
                  max={3650}
                  value={alertDays}
                  onChange={e => { setAlertDays(Number(e.target.value)); setPreview(null); }}
                  className="w-24 px-3 py-1.5 rounded-lg text-sm"
                  style={{ border: '1px solid #d1d5db', fontFamily: "'Space Mono', monospace", color: '#111827', outline: 'none' }}
                />
                <span className="text-sm" style={{ color: '#6b7280' }}>hari</span>
              </div>
            </label>
          </div>

          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
            style={{ background: '#16a34a', color: '#ffffff', cursor: loadingPreview ? 'not-allowed' : 'pointer', opacity: loadingPreview ? 0.7 : 1 }}
          >
            {loadingPreview && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {loadingPreview ? 'Mengecek...' : 'Lihat Preview'}
          </button>
        </div>

        {/* ── Preview hasil ── */}
        {preview && (
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid #d1fae5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#16a34a' }}>
              Preview Data yang Akan Dihapus
            </div>

            {!hasData ? (
              <div className="flex items-center gap-2 text-sm py-2" style={{ color: '#16a34a' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Tidak ada data yang memenuhi kriteria penghapusan.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Trip normal */}
                <PreviewCard
                  label={`Trip normal › lebih dari ${preview.config.normal_days} hari`}
                  trips={preview.normal.trips}
                  trip_list={preview.normal.trip_list}
                  rows={preview.normal.rows}
                  warn={false}
                />
                <PreviewCard
                  label={`Trip paket hilang › lebih dari ${preview.config.alert_days} hari`}
                  trips={preview.with_alerts.trips}
                  trip_list={preview.with_alerts.trip_list}
                  rows={preview.with_alerts.rows}
                  warn={true}
                />

                {/* Total */}
                <div className="pt-2 border-t text-xs" style={{ borderColor: '#f0fdf4', color: '#6b7280' }}>
                  Total baris dihapus:{' '}
                  <span style={{ fontFamily: "'Space Mono', monospace", color: '#111827', fontWeight: 600 }}>
                    {fmtNum(totalRows(preview.normal.rows) + totalRows(preview.with_alerts.rows))}
                  </span>
                  {' '}dari{' '}
                  <span style={{ fontFamily: "'Space Mono', monospace", color: '#111827', fontWeight: 600 }}>
                    {preview.normal.trips + preview.with_alerts.trips}
                  </span>
                  {' '}trip
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Konfirmasi & Eksekusi ── */}
        {hasData && (
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: '#dc2626' }}>
              Konfirmasi Penghapusan
            </div>
            <p className="text-sm" style={{ color: '#7f1d1d' }}>
              Tindakan ini <strong>tidak dapat dibatalkan</strong>. Data GPS, telemetry, dan RFID
              event akan dihapus permanen. Ketik <strong>HAPUS</strong> untuk melanjutkan.
            </p>
            <input
              type="text"
              placeholder="Ketik HAPUS"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-48 px-3 py-1.5 rounded-lg text-sm"
              style={{ border: `1px solid ${confirm === 'HAPUS' ? '#dc2626' : '#fca5a5'}`, fontFamily: "'Space Mono', monospace", color: '#111827', outline: 'none', background: '#fff' }}
            />
            <button
              onClick={handleRun}
              disabled={confirm !== 'HAPUS' || running}
              className="self-start px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity"
              style={{
                background: confirm === 'HAPUS' && !running ? '#dc2626' : '#fca5a5',
                color: '#ffffff',
                cursor: confirm === 'HAPUS' && !running ? 'pointer' : 'not-allowed',
              }}
            >
              {running && (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {running ? 'Menghapus...' : 'Jalankan Pembersihan'}
            </button>
          </div>
        )}

        {/* ── Hasil ── */}
        {result && (
          <div
            className="rounded-xl p-4 flex items-center gap-3 text-sm"
            style={{
              background: result === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${result === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: result === 'success' ? '#15803d' : '#dc2626',
            }}
          >
            {result === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            )}
            {resultMsg}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function PreviewCard({ label, trips, trip_list, rows, warn }: {
  label: string; trips: number; trip_list: TripEntry[]; rows: PreviewRows; warn: boolean;
}) {
  if (trips === 0) return null;
  const color = warn ? '#d97706' : '#16a34a';
  return (
    <div className="rounded-lg p-3 flex flex-col gap-3" style={{ background: warn ? '#fffbeb' : '#f0fdf4', border: `1px solid ${warn ? '#fde68a' : '#d1fae5'}` }}>
      <div className="text-xs font-medium" style={{ color }}>{label}</div>

      {/* Daftar trip yang terdampak */}
      <div className="flex flex-wrap gap-1.5">
        {trip_list.map(t => (
          <span key={t.id} className="text-xs px-2 py-0.5 rounded" style={{ fontFamily: "'Space Mono', monospace", background: warn ? '#fef3c7' : '#dcfce7', color: warn ? '#92400e' : '#166534', border: `1px solid ${warn ? '#fde68a' : '#bbf7d0'}` }}>
            {t.kode_truk} <span style={{ opacity: 0.6 }}>#{t.id}</span>
          </span>
        ))}
      </div>

      {/* Jumlah baris */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t" style={{ borderColor: warn ? '#fde68a' : '#d1fae5' }}>
        {[
          { label: 'Trip', val: trips },
          { label: 'Telemetry', val: rows.telemetry },
          { label: 'GPS Log', val: rows.gps_log },
          { label: 'RFID Event', val: rows.rfid_event },
        ].map(s => (
          <div key={s.label}>
            <div className="text-xs" style={{ color: '#6b7280' }}>{s.label}</div>
            <div className="text-sm font-semibold" style={{ fontFamily: "'Space Mono', monospace", color: '#111827' }}>
              {fmtNum(s.val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
