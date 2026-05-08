import { useState, useEffect } from 'react'
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
import { supabase } from './lib/supabase'
import UserManagementTab from './tabs/UserManagementTab'
import type { DailyRow, GlobalData } from './types/global'

type Tab = 'overview' | 'campaign' | 'creative' | 'audience' | 'budget' | 'conversion' | 'settings' | 'campaigns' | 'datainput' | 'users'

function App() {
  const { user, profile, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [globalRows, setGlobalRows] = useState<DailyRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const fetchGlobalData = async (clientId: string = 'all') => {
    setDataLoading(true)

    let query = supabase
      .from('fact_daily_performance')
      .select(`
        report_date, spend, impressions, clicks,
        conversions_7d_click, conversion_value, client_id,
        dim_platforms(platform_name)
      `)
      .order('report_date', { ascending: true })

    if (clientId !== 'all') {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (!error && data) {
      const mapped = data.map((r: any) => ({
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
      setGlobalRows(mapped)
    }
    setDataLoading(false)
  }

  useEffect(() => {
    if (user) {
      // Kalau role client, auto-filter ke client mereka sendiri
      if (profile?.role === 'client' && profile?.client_id) {
        setSelectedClient(profile.client_id)
        fetchGlobalData(profile.client_id)
      } else {
        fetchGlobalData('all')
      }
    }
  }, [user, profile])

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    fetchGlobalData(clientId)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f3' }}>
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
    refetch: () => fetchGlobalData(selectedClient),
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f3' }}>
      <TopBar
        onSignOut={signOut}
        userEmail={user.email}
        role={role}
        selectedClient={selectedClient}
        onClientChange={handleClientChange}
      />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      <main className="p-4">
        {activeTab === 'overview' && <OverviewTab globalData={globalData} />}
        {activeTab === 'campaign' && <CampaignTab clientId={selectedClient} />}
        {activeTab === 'creative' && <CreativeTab />}
        {activeTab === 'audience' && <AudienceTab />}
        {activeTab === 'budget' && <BudgetTab clientId={selectedClient} />}
        {activeTab === 'conversion' && <ConversionTab clientId={selectedClient} />}
        {canAccessAdmin && activeTab === 'settings' && <AdsSettingTab />}
        {canAccessAdmin && activeTab === 'campaigns' && <UpdateSettingTab />}
        {canAccessAdmin && activeTab === 'datainput' && <DataInputTab />}
        {role === 'founder' && activeTab === 'users' && <UserManagementTab />}
      </main>
    </div>
  )
}

export default App
