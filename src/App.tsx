import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import LoginPage from './LoginPage'
import TopBar from './components/TopBar'
import TabNav from './components/TabNav'
import OverviewTab from './tabs/OverviewTab'
import CampaignTab from './tabs/CampaignTab'
import CreativeTab from './tabs/CreativeTab'
import AudienceTab from './tabs/AudienceTab'
import BudgetTab from './tabs/BudgetTab'
import ConversionTab from './tabs/ConversionTab'
import AdsSettingTab from './tabs/AdsSettingTab'
import UpdateSettingTab from './tabs/UpdateSettingTab'
import DataInputTab from './tabs/DataInputTab'
import UserManagementTab from './tabs/UserManagementTab'
import { supabase } from './lib/supabase'
import type { DailyRow, GlobalData, FilterState, Tab } from './types/global'

// Default filter: Last 30 hari, semua platform
const today = new Date()
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(today.getDate() - 29)

const DEFAULT_FILTERS: FilterState = {
  platform: 'All',
  period: 'Last 30 days',
  dateRange: {
    from: thirtyDaysAgo.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  },
}

function App() {
  const { user, profile, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [globalRows, setGlobalRows] = useState<DailyRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // Fetch data dari Supabase.
  // Filter platform & tanggal diterapkan di sini (server-side) untuk efisiensi.
  const fetchGlobalData = useCallback(async (
    clientId: string,
    activeFilters: FilterState,
  ) => {
    setDataLoading(true)

    let query = supabase
      .from('fact_daily_performance')
      .select(`
        report_date, spend, impressions, clicks,
        conversions_7d_click, conversion_value, client_id,
        dim_platforms(platform_name)
      `)
      .order('report_date', { ascending: true })

    // Filter client
    if (clientId !== 'all') {
      query = query.eq('client_id', clientId)
    }

    // Filter tanggal (kalau dateRange tersedia)
    if (activeFilters.dateRange) {
      query = query
        .gte('report_date', activeFilters.dateRange.from)
        .lte('report_date', activeFilters.dateRange.to)
    }

    // Filter platform — kalau bukan 'All', filter di query
    if (activeFilters.platform !== 'All') {
      // join ke dim_platforms, filter berdasarkan platform_name
      // Note: kalau foreign key tidak bisa difilter langsung via PostgREST,
      // kita filter client-side setelah fetch (lihat mapped di bawah)
    }

    const { data, error } = await query

    if (!error && data) {
      let mapped: DailyRow[] = data.map((r: any) => ({
        report_date: r.report_date,
        spend: Number(r.spend),
        impressions: Number(r.impressions),
        clicks: Number(r.clicks),
        conversions_7d_click: Number(r.conversions_7d_click),
        conversion_value: Number(r.conversion_value),
        platform_name: Array.isArray(r.dim_platforms)
          ? r.dim_platforms[0]?.platform_name
          : r.dim_platforms?.platform_name || 'Unknown',
      }))

      // Filter platform client-side (aman untuk semua konfigurasi Supabase)
      if (activeFilters.platform !== 'All') {
        mapped = mapped.filter(
          row => row.platform_name.toLowerCase() === activeFilters.platform.toLowerCase()
        )
      }

      setGlobalRows(mapped)
    } else if (error) {
      console.error('fetchGlobalData error:', error.message)
    }

    setDataLoading(false)
  }, [])

  // Initial load ketika user/profile siap
  useEffect(() => {
    if (!user) return

    if (profile?.role === 'client' && profile?.client_id) {
      setSelectedClient(profile.client_id)
      fetchGlobalData(profile.client_id, filters)
    } else {
      fetchGlobalData('all', filters)
    }
  }, [user, profile])

  // Ketika client berubah
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    fetchGlobalData(clientId, filters)
  }

  // Ketika filter (platform/period) berubah
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    // Kalau period = 'Custom' tapi dateRange belum diset, tunggu dulu
    if (newFilters.period === 'Custom' && !newFilters.dateRange) return
    fetchGlobalData(selectedClient, newFilters)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: '#f5f5f3',
      }}>
        <div style={{ fontSize: '14px', color: '#888' }}>Memuat...</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const role = profile?.role || 'client'
  const canAccessAdmin = role === 'founder' || role === 'admin'

  const globalData: GlobalData = {
    rows: globalRows,
    loading: dataLoading,
    refetch: () => fetchGlobalData(selectedClient, filters),
    filters,
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f3' }}>
      <TopBar
        onSignOut={signOut}
        userEmail={user.email}
        role={role}
        selectedClient={selectedClient}
        onClientChange={handleClientChange}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      <main className="p-4">
        {activeTab === 'overview'    && <OverviewTab globalData={globalData} />}
        {activeTab === 'campaign'    && <CampaignTab clientId={selectedClient} globalData={globalData} />}
        {activeTab === 'creative'    && <CreativeTab globalData={globalData} />}
        {activeTab === 'audience'    && <AudienceTab globalData={globalData} />}
        {activeTab === 'budget'      && <BudgetTab clientId={selectedClient} globalData={globalData} />}
        {activeTab === 'conversion'  && <ConversionTab clientId={selectedClient} globalData={globalData} />}
        {canAccessAdmin && activeTab === 'settings'   && <AdsSettingTab />}
        {canAccessAdmin && activeTab === 'campaigns'  && <UpdateSettingTab />}
        {canAccessAdmin && activeTab === 'datainput'  && <DataInputTab />}
        {role === 'founder' && activeTab === 'users'  && <UserManagementTab />}
      </main>
    </div>
  )
}

export default App
