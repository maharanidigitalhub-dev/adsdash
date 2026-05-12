import { useState, useEffect, useCallback, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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
import LoginPage from './LoginPage'
import { supabase } from './lib/supabase'
import type { DailyRow, GlobalData, FilterState, Tab } from './types/global'

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

function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([])
  const [globalRows, setGlobalRows] = useState<DailyRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // FIX: simpan nilai terbaru filters & selectedClient di ref
  // supaya fetchData selalu pakai nilai terkini tanpa perlu masuk dependency
  const filtersRef = useRef<FilterState>(DEFAULT_FILTERS)
  const selectedClientRef = useRef<string>('all')
  const assignedClientIdsRef = useRef<string[]>([])

  const role = profile?.role ?? 'client'
  const canAccessAdmin = role === 'founder' || role === 'admin'

  // Selalu sync ref ke state terbaru
  useEffect(() => { filtersRef.current = filters }, [filters])
  useEffect(() => { selectedClientRef.current = selectedClient }, [selectedClient])
  useEffect(() => { assignedClientIdsRef.current = assignedClientIds }, [assignedClientIds])

  const fetchGlobalDataByIds = useCallback(async (
    clientIds: string[],
    clientId: string,
    activeFilters: FilterState,
  ) => {
    setDataLoading(true)
    try {
      let query = supabase
        .from('fact_daily_performance')
        .select(`
          report_date, spend, impressions, clicks,
          conversions_7d_click, conversion_value, client_id, campaign_id,
          dim_platforms(platform_name),
          dim_campaigns(campaign_name)
        `)
        .order('report_date', { ascending: true })

      if (clientId !== 'all') {
        query = query.eq('client_id', clientId)
      } else if (clientIds.length > 0) {
        query = query.in('client_id', clientIds)
      }

      if (activeFilters.dateRange) {
        query = query
          .gte('report_date', activeFilters.dateRange.from)
          .lte('report_date', activeFilters.dateRange.to)
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
          campaign_name: Array.isArray(r.dim_campaigns)
            ? r.dim_campaigns[0]?.campaign_name
            : r.dim_campaigns?.campaign_name,
          campaign_id: r.campaign_id,
          client_id: r.client_id,
        }))
        if (activeFilters.platform !== 'All') {
          mapped = mapped.filter(row =>
            row.platform_name.toLowerCase() === activeFilters.platform.toLowerCase()
          )
        }
        setGlobalRows(mapped)
      }
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }, [])

  const fetchGlobalDataAll = useCallback(async (activeFilters: FilterState) => {
    setDataLoading(true)
    try {
      let query = supabase
        .from('fact_daily_performance')
        .select(`
          report_date, spend, impressions, clicks,
          conversions_7d_click, conversion_value, client_id, campaign_id,
          dim_platforms(platform_name),
          dim_campaigns(campaign_name)
        `)
        .order('report_date', { ascending: true })

      if (activeFilters.dateRange) {
        query = query
          .gte('report_date', activeFilters.dateRange.from)
          .lte('report_date', activeFilters.dateRange.to)
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
          campaign_name: Array.isArray(r.dim_campaigns)
            ? r.dim_campaigns[0]?.campaign_name
            : r.dim_campaigns?.campaign_name,
          campaign_id: r.campaign_id,
          client_id: r.client_id,
        }))
        if (activeFilters.platform !== 'All') {
          mapped = mapped.filter(row =>
            row.platform_name.toLowerCase() === activeFilters.platform.toLowerCase()
          )
        }
        setGlobalRows(mapped)
      }
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }, [])

  // FIX: helper yang selalu pakai nilai terkini dari ref
  const refetch = useCallback(() => {
    const f = filtersRef.current
    const client = selectedClientRef.current
    const ids = assignedClientIdsRef.current
    if (role === 'founder') {
      if (client === 'all') fetchGlobalDataAll(f)
      else fetchGlobalDataByIds([], client, f)
    } else {
      fetchGlobalDataByIds(ids, client, f)
    }
  }, [role, fetchGlobalDataAll, fetchGlobalDataByIds])

  useEffect(() => {
    if (!user || !profile) return

    const initData = async () => {
      if (profile.role === 'founder') {
        setAssignedClientIds([])
        // FIX: pakai filtersRef.current agar selalu up to date
        fetchGlobalDataAll(filtersRef.current)
      } else {
        const { data: userClients } = await supabase
          .from('user_clients')
          .select('client_id')
          .eq('user_id', user.id)

        const ids = userClients?.map((uc: any) => uc.client_id) || []
        setAssignedClientIds(ids)
        assignedClientIdsRef.current = ids

        if (ids.length === 0) {
          setGlobalRows([])
          setDataLoading(false)
          return
        }

        if (ids.length === 1) {
          setSelectedClient(ids[0])
          selectedClientRef.current = ids[0]
          fetchGlobalDataByIds(ids, ids[0], filtersRef.current)
        } else {
          setSelectedClient('all')
          selectedClientRef.current = 'all'
          fetchGlobalDataByIds(ids, 'all', filtersRef.current)
        }
      }
    }

    initData()

    // Realtime: pakai refetch supaya selalu pakai filter terkini
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fact_daily_performance' }, () => {
        refetch()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_campaigns' }, () => {
        refetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, profile]) // tetap [user, profile] — initData hanya saat login

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    selectedClientRef.current = clientId
    const f = filtersRef.current
    if (role === 'founder') {
      if (clientId === 'all') fetchGlobalDataAll(f)
      else fetchGlobalDataByIds([], clientId, f)
    } else {
      fetchGlobalDataByIds(assignedClientIdsRef.current, clientId, f)
    }
  }

  const handleFilterChange = (newFilters: FilterState) => {
    // FIX: update state DAN ref sekaligus
    setFilters(newFilters)
    filtersRef.current = newFilters

    if (newFilters.period === 'Custom' && !newFilters.dateRange) return

    const client = selectedClientRef.current
    const ids = assignedClientIdsRef.current

    if (role === 'founder') {
      if (client === 'all') fetchGlobalDataAll(newFilters)
      else fetchGlobalDataByIds([], client, newFilters)
    } else {
      fetchGlobalDataByIds(ids, client, newFilters)
    }
  }

  const globalData: GlobalData = {
    rows: globalRows,
    loading: dataLoading,
    refetch,
    filters, // FIX: selalu pakai state terbaru
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3' }}>
      <TopBar
        onSignOut={signOut}
        userEmail={user?.email}
        role={role}
        selectedClient={selectedClient}
        onClientChange={handleClientChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        assignedClientIds={assignedClientIds}
      />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      <main style={{ padding: '16px 20px' }}>
        {activeTab === 'overview'   && <OverviewTab globalData={globalData} />}
        {activeTab === 'campaign'   && <CampaignTab clientId={selectedClient} globalData={globalData} />}
        {activeTab === 'creative'   && <CreativeTab globalData={globalData} />}
        {activeTab === 'audience'   && <AudienceTab clientId={selectedClient} />}
        {activeTab === 'budget'     && <BudgetTab clientId={selectedClient} globalData={globalData} />}
        {activeTab === 'conversion' && <ConversionTab clientId={selectedClient} globalData={globalData} />}
        {canAccessAdmin && activeTab === 'settings'  && <AdsSettingTab />}
        {canAccessAdmin && activeTab === 'campaigns' && <UpdateSettingTab />}
        {canAccessAdmin && activeTab === 'datainput' && <DataInputTab />}
        {role === 'founder' && activeTab === 'users' && <UserManagementTab />}
      </main>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f3' }}>
        <div style={{ fontSize: '14px', color: '#888' }}>Memuat...</div>
      </div>
    )
  }
  if (!user) return <LoginPage />
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
