/**
 * PANDUAN: Cara pakai filter di setiap Tab
 * =========================================
 *
 * Setiap tab yang menerima `globalData` sekarang juga mendapat `globalData.filters`.
 * Gunakan hook `useFilteredRows` untuk mendapat data yang sudah terfilter.
 *
 * SEBELUM (data tidak terfilter):
 * --------------------------------
 * function OverviewTab({ globalData }: { globalData: GlobalData }) {
 *   const rows = globalData.rows  // ← semua data, tidak terfilter
 *   ...
 * }
 *
 * SESUDAH (data terfilter otomatis):
 * ------------------------------------
 * import { useFilteredRows } from '../hooks/useFilteredRows'
 *
 * function OverviewTab({ globalData }: { globalData: GlobalData }) {
 *   const rows = useFilteredRows(globalData.rows, globalData.filters)
 *   // rows sekarang sudah difilter sesuai platform & periode yang dipilih user
 *   ...
 * }
 *
 * Ini berlaku untuk SEMUA tab: OverviewTab, CampaignTab, BudgetTab, ConversionTab, dll.
 *
 *
 * CONTOH LENGKAP OverviewTab:
 * ---------------------------
 */

import { useMemo } from 'react'
import type { GlobalData } from '../types/global'
import { useFilteredRows } from '../hooks/useFilteredRows'

interface Props {
  globalData: GlobalData
}

// Contoh: hitung total KPI dari rows yang terfilter
function sumRows(rows: ReturnType<typeof useFilteredRows>) {
  return rows.reduce(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      conversions: acc.conversions + r.conversions_7d_click,
      revenue: acc.revenue + r.conversion_value,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  )
}

export default function OverviewTab({ globalData }: Props) {
  // ← SATU BARIS INI yang membuat filter berfungsi
  const rows = useFilteredRows(globalData.rows, globalData.filters)

  const kpi = useMemo(() => sumRows(rows), [rows])

  if (globalData.loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
        Memuat data...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
        Tidak ada data untuk filter yang dipilih.
      </div>
    )
  }

  const fmt = (n: number) => n.toLocaleString('id-ID')
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
      {[
        { label: 'Total Spend', value: fmtCurrency(kpi.spend) },
        { label: 'Impressions', value: fmt(kpi.impressions) },
        { label: 'Clicks', value: fmt(kpi.clicks) },
        { label: 'CTR', value: kpi.impressions > 0 ? `${((kpi.clicks / kpi.impressions) * 100).toFixed(2)}%` : '-' },
        { label: 'Conversions', value: fmt(kpi.conversions) },
        { label: 'Revenue', value: fmtCurrency(kpi.revenue) },
        { label: 'ROAS', value: kpi.spend > 0 ? `${(kpi.revenue / kpi.spend).toFixed(2)}x` : '-' },
      ].map(card => (
        <div key={card.label} style={{
          background: '#fff', borderRadius: '10px',
          border: '0.5px solid rgba(0,0,0,0.07)',
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <div style={{ fontSize: '11px', color: '#888' }}>{card.label}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}
