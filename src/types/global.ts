export type Tab = 'overview' | 'campaign' | 'creative' | 'audience' | 'budget' | 'conversion' | 'settings' | 'campaigns' | 'datainput' | 'users'

export interface DailyRow {
  report_date: string
  spend: number
  impressions: number
  clicks: number
  conversions_7d_click: number
  conversion_value: number
  platform_name: string
  campaign_name?: string
  campaign_id?: string
  client_id?: string
}

export interface FilterState {
  platform: string
  period: string
  dateRange?: {
    from: string
    to: string
  }
}

export interface GlobalData {
  rows: DailyRow[]
  loading: boolean
  refetch: () => void
  filters?: FilterState
}
