export interface DailyRow {
    report_date: string
    spend: number
    impressions: number
    clicks: number
    conversions_7d_click: number
    conversion_value: number
    platform_name: string
  }
  
  export interface GlobalData {
    rows: DailyRow[]
    loading: boolean
    refetch: () => void
  }