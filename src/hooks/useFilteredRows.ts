/**
 * useFilteredRows — helper untuk semua tab yang menerima globalData.
 *
 * Cara pakai di setiap tab:
 *
 *   import { useFilteredRows } from '../hooks/useFilteredRows'
 *
 *   const rows = useFilteredRows(globalData.rows, globalData.filters)
 *   // rows sudah terfilter platform & tanggal, siap dipakai langsung
 */

import type { DailyRow, FilterState } from '../types/global'

export function useFilteredRows(rows: DailyRow[], filters: FilterState): DailyRow[] {
  return rows.filter(row => {
    // Filter platform
    if (filters.platform !== 'All') {
      if (row.platform_name.toLowerCase() !== filters.platform.toLowerCase()) return false
    }

    // Filter tanggal
    if (filters.dateRange) {
      if (row.report_date < filters.dateRange.from) return false
      if (row.report_date > filters.dateRange.to) return false
    }

    return true
  })
}

/**
 * filterRows — versi non-hook kalau dibutuhkan di luar komponen React
 */
export function filterRows(rows: DailyRow[], filters: FilterState): DailyRow[] {
  return rows.filter(row => {
    if (filters.platform !== 'All') {
      if (row.platform_name.toLowerCase() !== filters.platform.toLowerCase()) return false
    }
    if (filters.dateRange) {
      if (row.report_date < filters.dateRange.from) return false
      if (row.report_date > filters.dateRange.to) return false
    }
    return true
  })
}
