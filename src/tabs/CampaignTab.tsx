import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter } from 'recharts'
import type { GlobalData } from '../types/global'

interface CampaignRow {
  campaign_id: string
  campaign_name: string
  objective: string
  status: string
  platform_name: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  hasData: boolean // true = ada data di periode ini, false = tidak ada
}

interface DailySpend {
  date: string
  [key: string]: number | string
}

function formatRp(v: number) {
  if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(1)}jt`
  if (v >= 1000) return `Rp ${(v / 1000).toFixed(0)}K`
  return `Rp ${Math.round(v)}`
}

function getRoasColor(v: number) {
  if (v >= 3) return '#3B6D11'
  if (v >= 2) return '#854F0B'
  return '#A32D2D'
}

function platformBadge(p: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Meta: { bg: '#E6F1FB', color: '#185FA5' },
    Google: { bg: '#FCEBEB', color: '#A32D2D' },
    TikTok: { bg: '#F1EFE8', color: '#444441' },
  }
  const s = map[p] || { bg: '#F1EFE8', color: '#444441' }
  return (
    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>{p}</span>
  )
}

function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Active: { bg: '#EAF3DE', color: '#27500A' },
    Paused: { bg: '#FAEEDA', color: '#633806' },
    Ended: { bg: '#F1EFE8', color: '#5F5E5A' },
  }
  const st = map[s] || map['Active']
  return (
    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: st.bg, color: st.color }}>{s}</span>
  )
}

const LINE_COLORS: Record<string, string> = {
  Meta: '#378ADD',
  Google: '#E24B4A',
  TikTok: '#888780',
}

export default function CampaignTab({
  clientId = 'all',
  globalData,
}: {
  clientId?: string
  globalData?: GlobalData
}) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [dailyData, setDailyData] = useState<DailySpend[]>([])
  const [scatterData, setScatterData] = useState<{ x: number; y: number; platform: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNoData, setShowNoData] = useState(false)

  const filtersRef = useRef(globalData?.filters)
  filtersRef.current = globalData?.filters

  const platform = globalData?.filters?.platform ?? 'All'
  const dateFrom  = globalData?.filters?.dateRange?.from ?? ''
  const dateTo    = globalData?.filters?.dateRange?.to ?? ''

  useEffect(() => {
    fetchData()
  }, [clientId, platform, dateFrom, dateTo])

  const fetchData = async () => {
    setLoading(true)
    const filters = filtersRef.current

    // Fetch ALL campaigns from dim_campaigns (not filtered by perf data)
    let campMetaQuery = supabase
      .from('dim_campaigns')
      .select('campaign_id, campaign_name, objective, status, dim_platforms(platform_name)')

    if (clientId !== 'all') campMetaQuery = campMetaQuery.eq('client_id', clientId)

    const { data: campMeta } = await campMetaQuery
    if (!campMeta) { setLoading(false); return }

    // Build lookup map: campaign_id → metadata
    const campMetaMap: Record<string, { campaign_name: string; objective: string; status: string; platform_name: string }> = {}
    campMeta.forEach((c: any) => {
      const pName = Array.isArray(c.dim_platforms)
        ? c.dim_platforms[0]?.platform_name
        : c.dim_platforms?.platform_name
      campMetaMap[c.campaign_id] = {
        campaign_name: c.campaign_name,
        objective: c.objective ?? '—',
        status: c.status ?? 'Active',
        platform_name: pName ?? '—',
      }
    })

    // Fetch performance data within date range
    let perfQuery = supabase
      .from('fact_daily_performance')
      .select('report_date, spend, impressions, clicks, conversions_7d_click, conversion_value, campaign_id')
      .order('report_date', { ascending: true })

    if (clientId !== 'all') perfQuery = perfQuery.eq('client_id', clientId)

    if (filters?.dateRange?.from && filters?.dateRange?.to) {
      perfQuery = perfQuery
        .gte('report_date', filters.dateRange.from)
        .lte('report_date', filters.dateRange.to)
    }

    const { data: perfData } = await perfQuery
    if (!perfData) { setLoading(false); return }

    // Build campaign performance map from perf data
    const campMap: Record<string, CampaignRow> = {}
    const dateMap: Record<string, Record<string, number>> = {}

    perfData.forEach((r: any) => {
      const id = r.campaign_id
      const meta = campMetaMap[id]
      if (!meta) return

      if (!campMap[id]) {
        campMap[id] = {
          campaign_id: id,
          campaign_name: meta.campaign_name,
          objective: meta.objective,
          status: meta.status,
          platform_name: meta.platform_name,
          spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
          ctr: 0, cpc: 0, cpa: 0, roas: 0,
          hasData: true,
        }
      }
      campMap[id].spend       += Number(r.spend)
      campMap[id].impressions += Number(r.impressions)
      campMap[id].clicks      += Number(r.clicks)
      campMap[id].conversions += Number(r.conversions_7d_click)
      campMap[id].revenue     += Number(r.conversion_value)

      const name = meta.campaign_name
      const date = r.report_date?.slice(5)
      if (!dateMap[date]) dateMap[date] = {}
      dateMap[date][name] = (dateMap[date][name] || 0) + Number(r.spend)
    })

    // Campaigns with perf data: compute ratios
    let campList: CampaignRow[] = Object.values(campMap).map(c => ({
      ...c,
      ctr:  c.impressions > 0 ? c.clicks / c.impressions * 100 : 0,
      cpc:  c.clicks > 0      ? c.spend / c.clicks             : 0,
      cpa:  c.conversions > 0 ? c.spend / c.conversions        : 0,
      roas: c.spend > 0       ? c.revenue / c.spend            : 0,
    }))

    // Add campaigns from dim_campaigns that have NO data in this period
    campMeta.forEach((c: any) => {
      if (campMap[c.campaign_id]) return // already in list
      const pName = Array.isArray(c.dim_platforms)
        ? c.dim_platforms[0]?.platform_name
        : c.dim_platforms?.platform_name
      campList.push({
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name,
        objective: c.objective ?? '—',
        status: c.status ?? 'Active',
        platform_name: pName ?? '—',
        spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
        ctr: 0, cpc: 0, cpa: 0, roas: 0,
        hasData: false,
      })
    })

    // Apply platform filter
    if (filters?.platform && filters.platform !== 'All') {
      campList = campList.filter(c =>
        c.platform_name?.toLowerCase() === filters.platform.toLowerCase()
      )
    }

    setCampaigns(campList)

    // Daily chart: only campaigns with data
    const validIds = new Set(campList.filter(c => c.hasData).map(c => c.campaign_id))
    const filteredDateMap: Record<string, Record<string, number>> = {}
    perfData.forEach((r: any) => {
      if (!validIds.has(r.campaign_id)) return
      const meta = campMetaMap[r.campaign_id]
      if (!meta) return
      const name = meta.campaign_name
      const date = r.report_date?.slice(5)
      if (!filteredDateMap[date]) filteredDateMap[date] = {}
      filteredDateMap[date][name] = (filteredDateMap[date][name] || 0) + Number(r.spend)
    })

    const daily = Object.entries(filteredDateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))
    setDailyData(daily)

    // Scatter: only campaigns with data
    const scatter = campList.filter(c => c.hasData).map(c => ({
      x: Math.round(c.cpc),
      y: parseFloat(c.ctr.toFixed(2)),
      platform: c.platform_name,
      name: c.campaign_name,
    }))
    setScatterData(scatter)

    setLoading(false)
  }

  const campaignNames = [...new Set(dailyData.flatMap(d => Object.keys(d).filter(k => k !== 'date')))]

  const campaignsWithData    = campaigns.filter(c => c.hasData)
  const campaignsWithoutData = campaigns.filter(c => !c.hasData)

  const totalSpend = campaignsWithData.reduce((s, c) => s + c.spend, 0)
  const totalConv  = campaignsWithData.reduce((s, c) => s + c.conversions, 0)
  const avgCTR  = campaignsWithData.length > 0 ? campaignsWithData.reduce((s, c) => s + c.ctr,  0) / campaignsWithData.length : 0
  const avgROAS = campaignsWithData.length > 0 ? campaignsWithData.reduce((s, c) => s + c.roas, 0) / campaignsWithData.length : 0

  // Table: always show campaigns with data; show no-data campaigns only if toggle on
  const tableSource = showNoData ? campaigns : campaignsWithData
  const filtered = tableSource.filter(c =>
    c.campaign_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' }}>Memuat data...</div>
  )

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          {
            label: 'Active Campaigns',
            value: campaigns.filter(c => c.status === 'Active').length.toString(),
            delta: `${campaignsWithData.length} ada data · ${campaignsWithoutData.length} tanpa data`,
            up: true,
          },
          { label: 'Total Spend',       value: formatRp(totalSpend), delta: 'semua campaign', up: true },
          { label: 'Avg CTR',           value: `${avgCTR.toFixed(2)}%`, delta: 'rata-rata', up: avgCTR > 1.5 },
          { label: 'Total Conversions', value: totalConv.toString(), delta: '7d click', up: true },
          { label: 'Avg ROAS',          value: `${avgROAS.toFixed(2)}x`, delta: 'rata-rata', up: avgROAS >= 2 },
        ].map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', color: k.up ? '#3B6D11' : '#A32D2D' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

        {/* Line Chart */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Daily spend per campaign</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatRp(v)} />
              {campaignNames.map((name) => {
                const camp = campaigns.find(c => c.campaign_name === name)
                const color = LINE_COLORS[camp?.platform_name || ''] || '#B4B2A9'
                return <Line key={name} type="monotone" dataKey={name} stroke={color} strokeWidth={2} dot={false} />
              })}
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {campaignNames.map(name => {
              const camp = campaigns.find(c => c.campaign_name === name)
              const color = LINE_COLORS[camp?.platform_name || ''] || '#B4B2A9'
              return (
                <span key={name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, display: 'inline-block' }} />{name}
                </span>
              )
            })}
          </div>
        </div>

        {/* Scatter */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>CTR vs CPC per campaign</div>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '10px' }}>Kiri atas = optimal (CTR tinggi, CPC rendah)</div>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" dataKey="x" name="CPC" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `Rp${(v/1000).toFixed(1)}K`} label={{ value: 'CPC', position: 'insideBottom', offset: -10, fontSize: 10 }} />
              <YAxis type="number" dataKey="y" name="CTR" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{d.name}</div>
                    <div>CTR: {d.y}%</div>
                    <div>CPC: {formatRp(d.x)}</div>
                  </div>
                )
              }} />
              {['Meta', 'Google', 'TikTok'].map(p => (
                <Scatter key={p} name={p} data={scatterData.filter(d => d.platform === p)} fill={LINE_COLORS[p] || '#B4B2A9'} fillOpacity={0.7} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            {['Meta', 'Google', 'TikTok'].map(p => (
              <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: LINE_COLORS[p], display: 'inline-block' }} />{p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>Campaign performance table</div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Toggle: tampilkan campaign tanpa data */}
            {campaignsWithoutData.length > 0 && (
              <button
                onClick={() => setShowNoData(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                  border: showNoData ? '1.5px solid #854F0B' : '0.5px solid rgba(0,0,0,0.15)',
                  background: showNoData ? '#FAEEDA' : '#fff',
                  color: showNoData ? '#854F0B' : '#888',
                  fontWeight: showNoData ? 500 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {/* Toggle pill */}
                <span style={{
                  width: '28px', height: '15px', borderRadius: '99px', position: 'relative', flexShrink: 0,
                  background: showNoData ? '#854F0B' : '#d0cfc9',
                  transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', top: '2px',
                    left: showNoData ? '15px' : '2px',
                    width: '11px', height: '11px', borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </span>
                Tampilkan tanpa data ({campaignsWithoutData.length})
              </button>
            )}

            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari campaign..."
              style={{ padding: '6px 10px', fontSize: '11px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', outline: 'none', width: '180px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
            <thead>
              <tr>
                {['Campaign', 'Platform', 'Objective', 'Status', 'Spend', 'Impressions', 'CTR', 'CPC', 'Conv.', 'CPA', 'ROAS'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, whiteSpace: 'nowrap', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>
                    Tidak ada campaign untuk filter yang dipilih
                  </td>
                </tr>
              ) : filtered.map((row, i) => (
                <tr key={row.campaign_id} style={{
                  background: !row.hasData ? '#fdfcf9' : i % 2 === 1 ? '#fafaf9' : '#fff',
                  opacity: row.hasData ? 1 : 0.6,
                }}>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {row.campaign_name}
                    {!row.hasData && (
                      <span style={{ marginLeft: '6px', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#F1EFE8', color: '#999', fontWeight: 400, verticalAlign: 'middle' }}>
                        no data
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{platformBadge(row.platform_name)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: '#888', fontSize: '11px' }}>{row.objective}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{statusBadge(row.status)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.hasData ? formatRp(row.spend) : '—'}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.hasData ? `${(row.impressions / 1000).toFixed(1)}K` : '—'}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.hasData ? `${row.ctr.toFixed(2)}%` : '—'}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.hasData ? formatRp(row.cpc) : '—'}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.hasData ? row.conversions : '—'}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.hasData ? formatRp(row.cpa) : '—'}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: row.hasData ? getRoasColor(row.roas) : '#bbb', fontWeight: row.hasData ? 500 : 400 }}>
                    {row.hasData ? `${row.roas.toFixed(2)}x` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#aaa', textAlign: 'right' }}>
          {showNoData
            ? `${campaignsWithData.length} ada data · ${campaignsWithoutData.length} tanpa data · ${campaigns.length} total`
            : `${campaignsWithData.length} campaign dengan data di periode ini${campaignsWithoutData.length > 0 ? ` · ${campaignsWithoutData.length} disembunyikan` : ''}`
          }
        </div>
      </div>
    </div>
  )
}
