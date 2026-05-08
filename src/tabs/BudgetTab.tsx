import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine } from 'recharts'

interface CampaignBudget {
  campaign_id: string
  campaign_name: string
  platform_name: string
  budget_type: string
  daily_budget: number | null
  allocated_budget: number | null
  start_date: string | null
  end_date: string | null
  total_spend: number
  status: string
}

function formatRp(v: number) {
  if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(1)}jt`
  if (v >= 1000) return `Rp ${(v / 1000).toFixed(0)}K`
  return `Rp ${Math.round(v)}`
}

function getPacingStatus(pctBudget: number, pctTime: number) {
  const diff = pctBudget - pctTime
  if (diff > 10) return 'Overpacing'
  if (diff < -10) return 'Underpacing'
  return 'On Track'
}

function pacingBadge(s: string) {
  const map: Record<string, { bg: string; color: string }> = {
    'On Track': { bg: '#EAF3DE', color: '#27500A' },
    'Overpacing': { bg: '#FCEBEB', color: '#A32D2D' },
    'Underpacing': { bg: '#FAEEDA', color: '#633806' },
  }
  const st = map[s] || map['On Track']
  return <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '99px', fontWeight: 500, background: st.bg, color: st.color }}>{s}</span>
}

function platformBadge(p: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Meta: { bg: '#E6F1FB', color: '#185FA5' },
    Google: { bg: '#FCEBEB', color: '#A32D2D' },
    TikTok: { bg: '#F1EFE8', color: '#444441' },
  }
  const s = map[p] || { bg: '#F1EFE8', color: '#444441' }
  return <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>{p}</span>
}

function getPacingColor(status: string) {
  if (status === 'On Track') return '#378ADD'
  if (status === 'Overpacing') return '#E24B4A'
  return '#EF9F27'
}

export default function BudgetTab({ clientId = 'all' }: { clientId?: string }) {
  const [campaigns, setCampaigns] = useState<CampaignBudget[]>([])
  const [dailyData, setDailyData] = useState<{ day: string; spend: number; cumulative: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [clientId])

  const fetchData = async () => {
    setLoading(true)

    // Fetch campaigns
    let campQuery = supabase
      .from('dim_campaigns')
      .select('campaign_id, campaign_name, budget_type, daily_budget, allocated_budget, start_date, end_date, status, client_id, dim_platforms(platform_name)')
    if (clientId !== 'all') campQuery = campQuery.eq('client_id', clientId)
    const { data: campData } = await campQuery

    // Fetch performance data
    let perfQuery = supabase
      .from('fact_daily_performance')
      .select('campaign_id, spend, report_date, client_id')
      .order('report_date', { ascending: true })
    if (clientId !== 'all') perfQuery = perfQuery.eq('client_id', clientId)
    const { data: perfData } = await perfQuery

    if (!campData || !perfData) { setLoading(false); return }

    // Aggregate spend per campaign and per date
    const spendByCamp: Record<string, number> = {}
    const dailySpend: Record<string, number> = {}

    perfData.forEach((r: any) => {
      spendByCamp[r.campaign_id] = (spendByCamp[r.campaign_id] || 0) + Number(r.spend)
      const date = r.report_date?.slice(5)
      dailySpend[date] = (dailySpend[date] || 0) + Number(r.spend)
    })

    const campList: CampaignBudget[] = campData.map((c: any) => ({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      platform_name: Array.isArray(c.dim_platforms) ? c.dim_platforms[0]?.platform_name : c.dim_platforms?.platform_name,
      budget_type: c.budget_type,
      daily_budget: c.daily_budget,
      allocated_budget: c.allocated_budget,
      start_date: c.start_date,
      end_date: c.end_date,
      total_spend: spendByCamp[c.campaign_id] || 0,
      status: c.status,
    }))

    setCampaigns(campList)

    // Build cumulative daily data
    let cumulative = 0
    const daily = Object.entries(dailySpend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, spend]) => {
        cumulative += spend
        return { day, spend, cumulative }
      })
    setDailyData(daily)

    setLoading(false)
  }

  const totalSpend = campaigns.reduce((s, c) => s + c.total_spend, 0)
  const totalBudget = campaigns.reduce((s, c) => {
    if (c.budget_type === 'daily' && c.daily_budget && c.start_date && c.end_date) {
      const days = Math.round((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000)
      return s + c.daily_budget * days
    }
    if (c.budget_type === 'lifetime' && c.allocated_budget) return s + c.allocated_budget
    return s
  }, 0)
  const totalRemaining = Math.max(0, totalBudget - totalSpend)
  const activeDays = dailyData.filter(d => d.spend > 0).length
  const avgBurnRate = activeDays > 0 ? totalSpend / activeDays : 0

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' }}>Memuat data...</div>
  )

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total Spend', value: formatRp(totalSpend), delta: 'semua campaign', up: true },
          { label: 'Est. Budget Allocated', value: totalBudget > 0 ? formatRp(totalBudget) : '—', delta: 'estimasi total', up: true },
          { label: 'Est. Remaining', value: totalBudget > 0 ? formatRp(totalRemaining) : '—', delta: totalBudget > 0 ? `${((totalRemaining / totalBudget) * 100).toFixed(0)}% tersisa` : '', up: totalRemaining > 0 },
          { label: 'Avg Burn Rate/hari', value: formatRp(avgBurnRate), delta: `${activeDays} hari aktif`, up: true },
        ].map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', color: k.up ? '#3B6D11' : '#A32D2D' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px', marginBottom: '16px' }}>

        {/* Cumulative Area Chart */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Cumulative spend over time</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip formatter={(v: number) => formatRp(v)} />
              <Area type="monotone" dataKey="cumulative" stroke="#378ADD" strokeWidth={2} fill="rgba(55,138,221,0.1)" name="Cumulative Spend" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pacing Gauges */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Pacing per campaign</div>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '12px' }}>Biru = budget terpakai · Abu = waktu berjalan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {campaigns.filter(c => c.start_date).map(c => {
              const now = new Date()
              const start = new Date(c.start_date!)
              const end = c.end_date ? new Date(c.end_date) : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
              const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
              const elapsed = Math.min(totalDays, Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000)))
              const pctTime = Math.round(elapsed / totalDays * 100)
              const budget = c.budget_type === 'daily' && c.daily_budget ? c.daily_budget * totalDays : c.allocated_budget || 0
              const pctBudget = budget > 0 ? Math.min(100, Math.round(c.total_spend / budget * 100)) : 0
              const pacingStatus = getPacingStatus(pctBudget, pctTime)

              return (
                <div key={c.campaign_id} style={{ background: '#f5f5f3', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.campaign_name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '9px', color: '#888', width: '40px' }}>Budget</span>
                      <div style={{ flex: 1, background: 'rgba(0,0,0,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${pctBudget}%`, height: '6px', borderRadius: '99px', background: getPacingColor(pacingStatus) }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#888', width: '32px', textAlign: 'right' }}>{pctBudget}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '9px', color: '#888', width: '40px' }}>Waktu</span>
                      <div style={{ flex: 1, background: 'rgba(0,0,0,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${pctTime}%`, height: '6px', borderRadius: '99px', background: '#888780' }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#888', width: '32px', textAlign: 'right' }}>{pctTime}%</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '5px' }}>{pacingBadge(pacingStatus)}</div>
                </div>
              )
            })}
            {campaigns.filter(c => c.start_date).length === 0 && (
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '20px' }}>
                Tidak ada campaign dengan periode yang ditentukan
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Spend Bar */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Daily spend</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 8)} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: number) => formatRp(v)} />
            {avgBurnRate > 0 && <ReferenceLine y={avgBurnRate} stroke="#E24B4A" strokeDasharray="4 4" strokeWidth={1.5} />}
            <Bar dataKey="spend" fill="#378ADD" radius={[2, 2, 0, 0]} name="Daily Spend" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Garis merah = avg burn rate harian ({formatRp(avgBurnRate)}/hari)</div>
      </div>

      {/* Budget Table */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Budget allocation table</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                {['Campaign', 'Platform', 'Budget Type', 'Spent', '% Used', 'Remaining', 'Periode', 'Pacing'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const now = new Date()
                const start = c.start_date ? new Date(c.start_date) : now
                const end = c.end_date ? new Date(c.end_date) : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
                const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
                const elapsed = Math.min(totalDays, Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000)))
                const pctTime = Math.round(elapsed / totalDays * 100)
                const budget = c.budget_type === 'daily' && c.daily_budget ? c.daily_budget * totalDays : c.allocated_budget || 0
                const pctBudget = budget > 0 ? Math.min(100, Math.round(c.total_spend / budget * 100)) : 0
                const remaining = Math.max(0, budget - c.total_spend)
                const pacingStatus = getPacingStatus(pctBudget, pctTime)

                return (
                  <tr key={c.campaign_id} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.campaign_name}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{platformBadge(c.platform_name)}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: '#888' }}>{c.budget_type || '—'}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{formatRp(c.total_spend)}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: pctBudget >= 90 ? '#A32D2D' : pctBudget >= 75 ? '#854F0B' : '#1a1a1a', fontWeight: 500 }}>{pctBudget}%</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{budget > 0 ? formatRp(remaining) : '—'}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: '#888', fontSize: '10px', whiteSpace: 'nowrap' }}>{c.start_date || '—'} → {c.end_date || '—'}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{pacingBadge(pacingStatus)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}