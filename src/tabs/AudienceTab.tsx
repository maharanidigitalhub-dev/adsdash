import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Adset {
  adset_id: string
  adset_name: string
  targeting_age_min: number | null
  targeting_age_max: number | null
  targeting_gender: string | null
  targeting_locations: string | null
  placements: string | null
  status: string
  campaign_id: string
  campaign_name?: string
  platform_name?: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

function getRoasColor(v: number) {
  if (v >= 3) return '#3B6D11'
  if (v >= 2) return '#854F0B'
  return '#A32D2D'
}

function platformBadge(p: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Meta:   { bg: '#E6F1FB', color: '#185FA5' },
    Google: { bg: '#FCEBEB', color: '#A32D2D' },
    TikTok: { bg: '#F1EFE8', color: '#444441' },
  }
  const s = map[p] || { bg: '#F1EFE8', color: '#444441' }
  return <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 500, background: s.bg, color: s.color }}>{p}</span>
}

function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Active: { bg: '#EAF3DE', color: '#27500A' },
    Paused: { bg: '#FAEEDA', color: '#633806' },
    Ended:  { bg: '#F1EFE8', color: '#5F5E5A' },
  }
  const st = map[s] || map['Active']
  return <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 500, background: st.bg, color: st.color }}>{s}</span>
}

function fmtRp(v: number) {
  if (v >= 1_000_000) return `Rp ${(v/1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `Rp ${(v/1_000).toFixed(0)}K`
  return `Rp ${Math.round(v)}`
}

export default function AudienceTab({ clientId = 'all' }: { clientId?: string }) {
  const [adsets, setAdsets] = useState<Adset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Ended'>('All')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [allSelected, setAllSelected] = useState(true)

  useEffect(() => { fetchData() }, [clientId])

  const fetchData = async () => {
    setLoading(true)

    let adsetQuery = supabase
      .from('dim_adsets')
      .select('adset_id, adset_name, targeting_age_min, targeting_age_max, targeting_gender, targeting_locations, placements, status, campaign_id, client_id, dim_campaigns(campaign_name, dim_platforms(platform_name))')
    if (clientId !== 'all') adsetQuery = adsetQuery.eq('client_id', clientId)
    const { data: adsetData } = await adsetQuery

    let perfQuery = supabase
      .from('fact_daily_performance')
      .select('adset_id, spend, impressions, clicks, conversions_7d_click, conversion_value')
    if (clientId !== 'all') perfQuery = perfQuery.eq('client_id', clientId)
    const { data: perfData } = await perfQuery

    if (!adsetData) { setLoading(false); return }

    const perfMap: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; revenue: number }> = {}
    perfData?.forEach((r: any) => {
      if (!r.adset_id) return
      if (!perfMap[r.adset_id]) perfMap[r.adset_id] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
      perfMap[r.adset_id].spend       += Number(r.spend)
      perfMap[r.adset_id].impressions += Number(r.impressions)
      perfMap[r.adset_id].clicks      += Number(r.clicks)
      perfMap[r.adset_id].conversions += Number(r.conversions_7d_click)
      perfMap[r.adset_id].revenue     += Number(r.conversion_value)
    })

    const mapped: Adset[] = adsetData.map((a: any) => {
      const camp = Array.isArray(a.dim_campaigns) ? a.dim_campaigns[0] : a.dim_campaigns
      const plat = Array.isArray(camp?.dim_platforms) ? camp?.dim_platforms[0] : camp?.dim_platforms
      const perf = perfMap[a.adset_id] || { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
      return {
        adset_id: a.adset_id,
        adset_name: a.adset_name,
        targeting_age_min: a.targeting_age_min,
        targeting_age_max: a.targeting_age_max,
        targeting_gender: a.targeting_gender,
        targeting_locations: a.targeting_locations,
        placements: a.placements,
        status: a.status,
        campaign_id: a.campaign_id,
        campaign_name: camp?.campaign_name,
        platform_name: plat?.platform_name,
        ...perf,
      }
    })

    setAdsets(mapped)
    setSelectedIds(new Set(mapped.map(a => a.adset_id)))
    setLoading(false)
  }

  const filtered = useMemo(() => adsets.filter(a => {
    const matchStatus   = statusFilter === 'All' || a.status === statusFilter
    const matchPlatform = platformFilter === 'All' || a.platform_name === platformFilter
    const matchSearch   = a.adset_name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchPlatform && matchSearch
  }), [adsets, statusFilter, platformFilter, search])

  const selected = useMemo(() => filtered.filter(a => selectedIds.has(a.adset_id)), [filtered, selectedIds])

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      setAllSelected(false)
    } else {
      setSelectedIds(new Set(filtered.map(a => a.adset_id)))
      setAllSelected(true)
    }
  }

  // KPIs dari selected
  const kpi = useMemo(() => selected.reduce((acc, a) => ({
    spend:       acc.spend       + a.spend,
    impressions: acc.impressions + a.impressions,
    clicks:      acc.clicks      + a.clicks,
    conversions: acc.conversions + a.conversions,
    revenue:     acc.revenue     + a.revenue,
  }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }), [selected])

  const ctr  = kpi.impressions > 0 ? kpi.clicks / kpi.impressions * 100 : 0
  const roas = kpi.spend > 0 ? kpi.revenue / kpi.spend : 0
  const cpa  = kpi.conversions > 0 ? kpi.spend / kpi.conversions : 0

  // Chart: CTR by age range
  const ageChartData = useMemo(() => {
    const map: Record<string, { impressions: number; clicks: number; spend: number; conversions: number }> = {}
    selected.forEach(a => {
      if (!a.targeting_age_min || !a.targeting_age_max) return
      const key = `${a.targeting_age_min}-${a.targeting_age_max}`
      if (!map[key]) map[key] = { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
      map[key].impressions += a.impressions
      map[key].clicks      += a.clicks
      map[key].spend       += a.spend
      map[key].conversions += a.conversions
    })
    return Object.entries(map).map(([age, d]) => ({
      age,
      ctr: d.impressions > 0 ? parseFloat((d.clicks / d.impressions * 100).toFixed(2)) : 0,
      cpa: d.conversions > 0 ? Math.round(d.spend / d.conversions / 1000) : 0,
    })).sort((a, b) => a.age.localeCompare(b.age))
  }, [selected])

  // Chart: spend by platform
  const platformChartData = useMemo(() => {
    const map: Record<string, number> = {}
    selected.forEach(a => {
      const p = a.platform_name || 'Unknown'
      map[p] = (map[p] || 0) + a.spend
    })
    return Object.entries(map).map(([platform, spend]) => ({ platform, spend }))
  }, [selected])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 13 }}>Memuat data...</div>

  if (adsets.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 13 }}>
      Belum ada ad set. Tambah via tab Ads Setting.
    </div>
  )

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Impressions', value: kpi.impressions >= 1000 ? `${(kpi.impressions/1000).toFixed(1)}K` : kpi.impressions.toString() },
          { label: 'Total Clicks',      value: kpi.clicks.toLocaleString('id') },
          { label: 'Blended CTR',       value: `${ctr.toFixed(2)}%` },
          { label: 'Blended ROAS',      value: `${roas.toFixed(2)}x` },
          { label: 'Blended CPA',       value: fmtRp(cpa) },
        ].map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{selected.length} ad set dipilih</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>

        {/* LEFT: Checkbox Panel */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 14, height: 'fit-content' }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Filter Ad Set</div>

          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ad set..."
            style={{ width: '100%', padding: '7px 10px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {(['All', 'Active', 'Paused', 'Ended'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, border: '0.5px solid rgba(0,0,0,0.15)', background: statusFilter === s ? '#185FA5' : '#fff', color: statusFilter === s ? '#fff' : '#666', cursor: 'pointer', fontWeight: statusFilter === s ? 500 : 400 }}>
                {s}
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {['All', 'Meta', 'Google', 'TikTok'].map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, border: '0.5px solid rgba(0,0,0,0.15)', background: platformFilter === p ? '#185FA5' : '#fff', color: platformFilter === p ? '#fff' : '#666', cursor: 'pointer', fontWeight: platformFilter === p ? 500 : 400 }}>
                {p}
              </button>
            ))}
          </div>

          {/* Select All */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer', marginBottom: 4 }}>
            <input type="checkbox" checked={filtered.every(a => selectedIds.has(a.adset_id))} onChange={toggleAll}
              style={{ width: 14, height: 14, cursor: 'pointer' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#555' }}>Pilih semua ({filtered.length})</span>
          </label>

          {/* Individual checkboxes */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filtered.map(a => (
              <label key={a.adset_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.has(a.adset_id)} onChange={() => toggleOne(a.adset_id)}
                  style={{ width: 14, height: 14, marginTop: 1, cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.adset_name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                    {a.platform_name && platformBadge(a.platform_name)}
                    {statusBadge(a.status)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* RIGHT: Charts + Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* CTR by Age */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>CTR & CPA by age targeting</div>
              {ageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}K`} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="ctr" name="CTR (%)" fill="#378ADD" radius={[3,3,0,0]} />
                    <Bar yAxisId="right" dataKey="cpa" name="CPA (Rp ribu)" fill="#E24B4A" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12 }}>
                  Pilih ad set dengan targeting usia
                </div>
              )}
            </div>

            {/* Spend by Platform */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Spend by platform</div>
              {platformChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={platformChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="platform" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => fmtRp(v)} />
                    <Tooltip formatter={(v: any) => fmtRp(Number(v))} />
                    <Bar dataKey="spend" name="Spend" fill="#185FA5" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 12 }}>Tidak ada data</div>
              )}
            </div>
          </div>

          {/* Ad Set Table */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>
              Ad set performance — {selected.length} dipilih
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Ad Set', 'Campaign', 'Platform', 'Usia', 'Gender', 'Lokasi', 'Spend', 'CTR', 'ROAS', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: 12 }}>Pilih minimal 1 ad set di panel kiri</td></tr>
                  ) : selected.map((a, i) => {
                    const ctr = a.impressions > 0 ? a.clicks / a.impressions * 100 : 0
                    const roas = a.spend > 0 ? a.revenue / a.spend : 0
                    return (
                      <tr key={a.adset_id} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.adset_name}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: '#888', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campaign_name || '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{a.platform_name ? platformBadge(a.platform_name) : '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>{a.targeting_age_min && a.targeting_age_max ? `${a.targeting_age_min}–${a.targeting_age_max}` : '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{a.targeting_gender || '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.targeting_locations || '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>{fmtRp(a.spend)}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{ctr.toFixed(2)}%</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: getRoasColor(roas), fontWeight: 500 }}>{roas > 0 ? `${roas.toFixed(2)}x` : '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{statusBadge(a.status)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
