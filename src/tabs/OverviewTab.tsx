import type { GlobalData } from '../types/global'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  globalData: GlobalData
}

const COLORS: Record<string, string> = {
  Meta: '#378ADD',
  Google: '#E24B4A',
  TikTok: '#888780',
}

const DEFAULT_COLOR = '#B4B2A9'

function getRoasColor(v: number) {
  if (v >= 3) return '#3B6D11'
  if (v >= 2) return '#854F0B'
  return '#A32D2D'
}

function formatRp(v: number) {
  if (v >= 1000000000) return `Rp ${(v / 1000000000).toFixed(1)}M`
  if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(1)}jt`
  if (v >= 1000) return `Rp ${(v / 1000).toFixed(0)}K`
  return `Rp ${v}`
}

function formatNum(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return `${v}`
}

export default function OverviewTab({ globalData }: Props) {
  const { rows, loading } = globalData

  const totalSpend = rows.reduce((s, r) => s + r.spend, 0)
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0)
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  const totalConversions = rows.reduce((s, r) => s + r.conversions_7d_click, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.conversion_value, 0)
  const blendedCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
  const blendedCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
  const blendedROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const blendedCPA = totalConversions > 0 ? totalSpend / totalConversions : 0

  const kpis = [
    { label: 'Total Spend', value: formatRp(totalSpend), delta: `${rows.length} records`, up: true },
    { label: 'Impressions', value: formatNum(totalImpressions), delta: 'total periode', up: true },
    { label: 'Total Clicks', value: formatNum(totalClicks), delta: `CTR ${blendedCTR.toFixed(2)}%`, up: true },
    { label: 'Blended CTR', value: `${blendedCTR.toFixed(2)}%`, delta: 'avg periode', up: blendedCTR > 2 },
    { label: 'Blended CPC', value: formatRp(blendedCPC), delta: 'per klik', up: blendedCPC < 5000 },
    { label: 'Blended ROAS', value: `${blendedROAS.toFixed(2)}x`, delta: `CPA ${formatRp(blendedCPA)}`, up: blendedROAS >= 2 },
  ]

  const platforms = [...new Set(rows.map(r => r.platform_name))]

  const spendByDate: Record<string, Record<string, number>> = {}
  rows.forEach(r => {
    if (!spendByDate[r.report_date]) spendByDate[r.report_date] = {}
    spendByDate[r.report_date][r.platform_name] = (spendByDate[r.report_date][r.platform_name] || 0) + r.spend
  })
  const spendData = Object.entries(spendByDate).map(([date, vals]) => ({ date: date.slice(5), ...vals }))

  const spendByPlatform: Record<string, number> = {}
  rows.forEach(r => { spendByPlatform[r.platform_name] = (spendByPlatform[r.platform_name] || 0) + r.spend })
  const donutData = Object.entries(spendByPlatform).map(([name, value]) => ({ name, value }))
  const totalPlatformSpend = donutData.reduce((s, d) => s + d.value, 0)

  const roasByPlatform: Record<string, { spend: number; revenue: number }> = {}
  rows.forEach(r => {
    if (!roasByPlatform[r.platform_name]) roasByPlatform[r.platform_name] = { spend: 0, revenue: 0 }
    roasByPlatform[r.platform_name].spend += r.spend
    roasByPlatform[r.platform_name].revenue += r.conversion_value
  })
  const roasData = Object.entries(roasByPlatform)
    .map(([platform, { spend, revenue }]) => ({ platform, roas: spend > 0 ? revenue / spend : 0 }))
    .sort((a, b) => b.roas - a.roas)

  const tableData = Object.entries(spendByPlatform).map(([platform]) => {
    const platformRows = rows.filter(r => r.platform_name === platform)
    const spend = platformRows.reduce((s, r) => s + r.spend, 0)
    const impressions = platformRows.reduce((s, r) => s + r.impressions, 0)
    const clicks = platformRows.reduce((s, r) => s + r.clicks, 0)
    const conv = platformRows.reduce((s, r) => s + r.conversions_7d_click, 0)
    const revenue = platformRows.reduce((s, r) => s + r.conversion_value, 0)
    return {
      platform,
      spend,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      conv,
      cpa: conv > 0 ? spend / conv : 0,
      roas: spend > 0 ? revenue / spend : 0,
    }
  })

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
        Memuat data...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Belum ada data performa.</div>
        <div style={{ fontSize: '12px', color: '#aaa' }}>Input data via tab Data Input atau import CSV.</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', color: k.up ? '#3B6D11' : '#A32D2D' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Spend over time — per platform</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={spendData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(spendData.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatRp(v)} />
              {platforms.map(p => (
                <Line key={p} type="monotone" dataKey={p} stroke={COLORS[p] || DEFAULT_COLOR} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {platforms.map(p => (
              <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[p] || DEFAULT_COLOR, display: 'inline-block' }} />{p}
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Spend distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {donutData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || DEFAULT_COLOR} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${(v / totalPlatformSpend * 100).toFixed(1)}% — ${formatRp(v)}`, 'Spend']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            {donutData.map((d, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[d.name] || DEFAULT_COLOR, display: 'inline-block' }} />
                {d.name} {(d.value / totalPlatformSpend * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>ROAS per platform</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={roasData} layout="vertical">
              <XAxis type="number" domain={[0, Math.max(...roasData.map(r => r.roas), 1) * 1.3]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}x`} />
              <YAxis type="category" dataKey="platform" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
              <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
                {roasData.map((entry, i) => <Cell key={i} fill={COLORS[entry.platform] || DEFAULT_COLOR} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Breakeven = 1.0x</div>
        </div>
      </div>

      {/* Bottom Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Platform comparison</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
            <thead>
              <tr>
                {['Platform', 'Spend', 'CTR', 'CPC', 'Conv.', 'CPA', 'ROAS'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map(row => (
                <tr key={row.platform}>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <span style={{
                      fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500,
                      background: row.platform === 'Meta' ? '#E6F1FB' : row.platform === 'Google' ? '#FCEBEB' : '#F1EFE8',
                      color: row.platform === 'Meta' ? '#185FA5' : row.platform === 'Google' ? '#A32D2D' : '#444441',
                    }}>{row.platform}</span>
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>{formatRp(row.spend)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>{row.ctr.toFixed(2)}%</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>{formatRp(row.cpc)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>{row.conv}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>{formatRp(row.cpa)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', color: getRoasColor(row.roas), fontWeight: 500 }}>{row.roas.toFixed(2)}x</td>
                </tr>
              ))}
              <tr style={{ background: '#f5f5f3' }}>
                <td style={{ padding: '6px 8px', fontWeight: 500, fontSize: '11px' }}>Total</td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{formatRp(totalSpend)}</td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{blendedCTR.toFixed(2)}%</td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{formatRp(blendedCPC)}</td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{totalConversions}</td>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{formatRp(blendedCPA)}</td>
                <td style={{ padding: '6px 8px', fontWeight: 500, color: getRoasColor(blendedROAS) }}>{blendedROAS.toFixed(2)}x</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Top campaigns by ROAS</div>
          <TopCampaigns />
        </div>
      </div>
    </div>
  )
}

function TopCampaigns() {
  const [data, setData] = useState<{ name: string; platform: string; spend: number; roas: number; status: string }[]>([])

  useEffect(() => {
    const fetch = async () => {
      const { data: rows } = await supabase
        .from('fact_daily_performance')
        .select('spend, conversion_value, campaign_id, dim_campaigns(campaign_name, status), dim_platforms(platform_name)')

      if (!rows) return

      const map: Record<string, { name: string; platform: string; spend: number; revenue: number; status: string }> = {}
      rows.forEach((r: any) => {
        const id = r.campaign_id
        const name = Array.isArray(r.dim_campaigns) ? r.dim_campaigns[0]?.campaign_name : r.dim_campaigns?.campaign_name
        const platform = Array.isArray(r.dim_platforms) ? r.dim_platforms[0]?.platform_name : r.dim_platforms?.platform_name
        const status = Array.isArray(r.dim_campaigns) ? r.dim_campaigns[0]?.status : r.dim_campaigns?.status
        if (!map[id]) map[id] = { name, platform, spend: 0, revenue: 0, status }
        map[id].spend += Number(r.spend)
        map[id].revenue += Number(r.conversion_value)
      })

      const result = Object.values(map)
        .map(c => ({ ...c, roas: c.spend > 0 ? c.revenue / c.spend : 0 }))
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 5)

      setData(result)
    }
    fetch()
  }, [])

  function getRoasColor(v: number) {
    if (v >= 3) return '#3B6D11'
    if (v >= 2) return '#854F0B'
    return '#A32D2D'
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr>
          {['Campaign', 'Platform', 'Spend', 'ROAS', 'Status'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 500 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
            <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <span style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500,
                background: row.platform === 'Meta' ? '#E6F1FB' : row.platform === 'Google' ? '#FCEBEB' : '#F1EFE8',
                color: row.platform === 'Meta' ? '#185FA5' : row.platform === 'Google' ? '#A32D2D' : '#444441',
              }}>{row.platform}</span>
            </td>
            <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              {row.spend >= 1000000 ? `Rp ${(row.spend / 1000000).toFixed(1)}jt` : `Rp ${(row.spend / 1000).toFixed(0)}K`}
            </td>
            <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', color: getRoasColor(row.roas), fontWeight: 500 }}>{row.roas.toFixed(2)}x</td>
            <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: '10px', color: row.status === 'Active' ? '#3B6D11' : '#854F0B' }}>{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}