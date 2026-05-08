export type Platform = 'Meta' | 'Google' | 'TikTok'

export interface KpiData {
  label: string
  value: string
  delta: string
  isPositive: boolean
}

export interface DailyPerformance {
  report_date: string
  platform_id: number
  campaign_id: string
  impressions: number
  clicks: number
  spend: number
  conversions_7d_click: number
  conversion_value: number
}

export interface Campaign {
  campaign_id: string
  platform_id: number
  campaign_name: string
  objective: string
  status: string
  allocated_budget: number
  start_date: string
  end_date: string | null
  target_roas: number
  target_cpa: number
}