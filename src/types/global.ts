export type Tab = 'overview' | 'campaign' | 'creative' | 'audience' | 'budget' | 'conversion' | 'settings' | 'campaigns' | 'datainput' | 'users'

export type PlatformFilter = 'All' | 'Meta' | 'Google' | 'TikTok'
export type PeriodFilter = 'Last 7 days' | 'Last 30 days' | 'Last 90 days' | 'Custom'

export interface DateRange {
  from: string
  to: string
}

export interface FilterState {
  platform: PlatformFilter
  period: PeriodFilter
  dateRange?: DateRange
}

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

export interface GlobalData {
  rows: DailyRow[]
  loading: boolean
  refetch: () => void
  filters?: FilterState
}
