import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, BarChart, Bar, Cell } from 'recharts'

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
  return <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>{p}</span>
}

const PLATFORM_COLORS: Record<string, string> = {
  Meta: '#378ADD',
  Google: '#E24B4A',
  TikTok: '#888780',
}

export default function ConversionTab({ clientId = 'all' }: { clientId?: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [clientId])

  const fetchData = async () => {
    setLoading(true)
    let query = supabase
      .from('fact_daily_performance')
      .select(`
        report_date, spend, impressions, clicks,
        conversions_7d_click, conversion_value, purchases,
        campaign_id, client_id,
        dim_campaigns(campaign_name, status, target_roas, target_cpa),
        dim_platforms(platform_name)
      `)
      .order('report_date', { ascending: true })

    if (clientId !== 'all') query = query.eq('client_id', clientId)
    const { data } = await query
    if (data) setRows(data)
    setLoading(false)
  }

  const totalSpend = rows.reduce((s, r) => s + Number(r.spend), 0)
  const totalRevenue = rows.reduce((s, r) => s + Number(r.conversion_value), 0)
  const totalConversions = rows.reduce((s, r) => s + Number(r.conversions_7d_click), 0)
  const totalClicks = rows.reduce((s, r) => s + Number(r.clicks), 0)
  const totalImpressions = rows.reduce((s, r) => s + Number(r.impressions), 0)
  const totalPurchases = rows.reduce((s, r) => s + Number(r.purchases), 0)
  const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const blendedCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
  const aov = totalConversions > 0 ? totalRevenue / totalConversions : 0

  // Daily ROAS line chart
  const dailyMap: Record<string, { spend: number; revenue: number; conv: number }> = {}
  rows.forEach(r => {
    const date = r.report_date?.slice(5)
    if (!dailyMap[date]) dailyMap[date] = { spend: 0, revenue: 0, conv: 0 }
    dailyMap[date].spend += Number(r.spend)
    dailyMap[date].revenue += Number(r.conversion_value)
    dailyMap[date].conv += Number(r.conversions_7d_click)
  })
  const roasData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      roas: d.spend > 0 ? parseFloat((d.revenue / d.spend).toFixed(2)) : 0,
    }))

  // Funnel
  const funnelData = [
    { stage: 'Impressions', value: totalImpressions },
    { stage: 'Clicks', value: totalClicks },
    { stage: 'Conversions', value: totalConversions },
    { stage: 'Purchases', value: totalPurchases },
  ]
  const maxFunnel = funnelData[0].value || 1
  const funnelColors = ['#B5D4F4', '#378ADD', '#185FA5', '#042C53']

  // CPA per campaign
  const campMap: Record<string, { name: string; platform: string; spend: number; conv: number; revenue: number }> = {}
  rows.forEach(r => {
    const id = r.campaign_id
    const name = Array.isArray(r.dim_campaigns) ? r.dim_campaigns[0]?.campaign_name : r.dim_campaigns?.campaign_name
    const platform = Array.isArray(r.dim_platforms) ? r.dim_platforms[0]?.platform_name : r.dim_platforms?.platform_name
    if (!campMap[id]) campMap[id] = { name, platform, spend: 0, conv: 0, revenue: 0 }
    campMap[id].spend += Number(r.spend)
    campMap[id].conv += Number(r.conversions_7d_click)
    campMap[id].revenue += Number(r.conversion_value)
  })
  const cpaData = Object.values(campMap)
    .map(c => ({ name: c.name, platform: c.platform, cpa: c.conv > 0 ? Math.round(c.spend / c.conv) : 0, roas: c.spend > 0 ? parseFloat((c.revenue / c.spend).toFixed(2)) : 0 }))
    .sort((a, b) => b.cpa - a.cpa)

  // ROAS heatmap by campaign x day of week
  const dowMap: Record<string, Record<string, { spend: number; revenue: number; count: number }>> = {}
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  rows.forEach(r => {
    const name = Array.isArray(r.dim_campaigns) ? r.dim_campaigns[0]?.campaign_name : r.dim_campaigns?.campaign_name
    const dow = days[new Date(r.report_date).getDay() === 0 ? 6 : new Date(r.report_date).getDay() - 1]
    if (!dowMap[name]) dowMap[name] = {}
    if (!dowMap[name][dow]) dowMap[name][dow] = { spend: 0, revenue: 0, count: 0 }
    dowMap[name][dow].spend += Number(r.spend)
    dowMap[name][dow].revenue += Number(r.conversion_value)
    dowMap[name][dow].count++
  })

  function getHeatColor(roas: number) {
    if (roas >= 3) return { bg: '#639922', color: '#173404' }
    if (roas >= 2) return { bg: '#97C459', color: '#27500A' }
    if (roas >= 1.5) return { bg: '#C0DD97', color: '#3B6D11' }
    if (roas >= 1) return { bg: '#EF9F27', color: '#412402' }
    return { bg: '#E24B4A', color: '#501313' }
  }

  // Attribution table
  const attrData = Object.values(campMap).map(c => ({
    name: c.name,
    platform: Object.values(campMap).find(x => x.name === c.name)?.platform || '',
    conv: c.conv,
    revenue: c.revenue,
    cpa: c.conv > 0 ? c.spend / c.conv : 0,
    roas: c.spend > 0 ? c.revenue / c.spend : 0,
    spend: c.spend,
  }))

  const targetROAS = 2.5

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' }}>Memuat data...</div>
  )

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total Conversions', value: totalConversions.toString(), delta: '7d click', up: true },
          { label: 'Total Revenue', value: formatRp(totalRevenue), delta: 'dari konversi', up: true },
          { label: 'Overall ROAS', value: `${overallROAS.toFixed(2)}x`, delta: `target ${targetROAS}x`, up: overallROAS >= targetROAS },
          { label: 'Blended CPA', value: formatRp(blendedCPA), delta: 'per konversi', up: blendedCPA < 50000 },
          { label: 'Avg Order Value', value: formatRp(aov), delta: 'per konversi', up: true },
          { label: 'vs Target ROAS', value: `${overallROAS >= targetROAS ? '+' : ''}${(overallROAS - targetROAS).toFixed(2)}x`, delta: overallROAS >= targetROAS ? 'Di atas target ✓' : 'Di bawah target', up: overallROAS >= targetROAS },
        ].map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: k.label === 'vs Target ROAS' ? (k.up ? '#3B6D11' : '#A32D2D') : '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', color: k.up ? '#3B6D11' : '#A32D2D' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

        {/* ROAS Line Chart */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>ROAS over time vs target</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={roasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(roasData.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}x`} domain={[0, 'auto']} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
              <ReferenceLine y={targetROAS} stroke="#E24B4A" strokeDasharray="5 5" strokeWidth={1.5} />
              <Line type="monotone" dataKey="roas" stroke="#378ADD" strokeWidth={2} dot={false} name="ROAS" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
              <span style={{ width: '10px', height: '3px', background: '#378ADD', display: 'inline-block', borderRadius: '2px' }} />Daily ROAS
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
              <span style={{ width: '10px', height: '2px', borderTop: '2px dashed #E24B4A', display: 'inline-block' }} />Target {targetROAS}x
            </span>
          </div>
        </div>

        {/* Funnel */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Conversion funnel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {funnelData.map((f, i) => {
              const drop = i > 0 ? ((f.value - funnelData[i - 1].value) / funnelData[i - 1].value * 100) : 0
              return (
                <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#888', width: '80px', textAlign: 'right', flexShrink: 0 }}>{f.stage}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: `${Math.max((f.value / maxFunnel) * 100, 2)}%`,
                      height: '24px', background: funnelColors[i], borderRadius: '3px',
                      display: 'flex', alignItems: 'center', paddingLeft: '8px',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 500, color: i >= 2 ? '#fff' : '#0C447C', whiteSpace: 'nowrap' }}>
                        {f.value >= 1000000 ? `${(f.value / 1000000).toFixed(1)}M` : f.value >= 1000 ? `${(f.value / 1000).toFixed(0)}K` : f.value}
                      </span>
                    </div>
                  </div>
                  {i > 0 && <span style={{ fontSize: '10px', color: '#A32D2D', flexShrink: 0, width: '48px' }}>{drop.toFixed(1)}%</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

        {/* CPA Bar Chart */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>CPA by campaign</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cpaData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => formatRp(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={100} />
              <Tooltip formatter={(v: number) => formatRp(v)} />
              <Bar dataKey="cpa" radius={[0, 4, 4, 0]} name="CPA">
                {cpaData.map((entry, i) => (
                  <Cell key={i} fill={PLATFORM_COLORS[entry.platform] || '#B4B2A9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ROAS Heatmap */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>ROAS heatmap — campaign × hari</div>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '12px' }}>Identifikasi hari terbaik untuk dayparting</div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(7, 1fr)', gap: '3px' }}>
            <div />
            {days.map(d => <div key={d} style={{ fontSize: '10px', color: '#888', textAlign: 'center', padding: '2px' }}>{d}</div>)}
            {Object.entries(dowMap).map(([campName, dowData]) => (
              <>
                <div key={campName} style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campName}</div>
                {days.map(day => {
                  const d = dowData[day]
                  const roas = d && d.spend > 0 ? d.revenue / d.spend : 0
                  const { bg, color } = getHeatColor(roas)
                  return (
                    <div key={day} style={{ height: '28px', borderRadius: '3px', background: d ? bg : '#f5f5f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, color: d ? color : '#ccc' }}>
                      {d ? `${roas.toFixed(1)}x` : '—'}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Attribution Table */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Conversion & attribution table</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                {['Campaign', 'Platform', 'Total Spend', 'Conversions', 'Revenue', 'CPA', 'ROAS'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrData.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap', fontWeight: 500 }}>{row.name}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{platformBadge(row.platform)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{formatRp(row.spend)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.conv}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{formatRp(row.revenue)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{formatRp(row.cpa)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: getRoasColor(row.roas), fontWeight: 500 }}>{row.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}