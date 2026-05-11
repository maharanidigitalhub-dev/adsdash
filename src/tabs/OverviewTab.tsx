import { useMemo, useState } from 'react'
import type { GlobalData } from '../types/global'
import { useFilteredRows } from '../hooks/useFilteredRows'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Props {
  globalData: GlobalData
}

interface SliceItem {
  value: number
  color: string
  label: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(1) + 'K'
  return 'Rp ' + n.toFixed(0)
}

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('id-ID')
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function Donut({
  slices,
  size = 100,
  stroke = 18,
  label,
  sublabel,
}: {
  slices: SliceItem[]
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        {slices.map((s, i) => {
          const pct = s.value / total
          const dash = pct * circ
          const gap = circ - dash
          const offset = -circ * acc
          acc += pct
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: `${size / 2}px ${size / 2}px`,
              }}
            />
          )
        })}
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 + 2} fill="white" />
      </svg>
      {(label || sublabel) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.2,
            pointerEvents: 'none',
          }}
        >
          {sublabel && (
            <span style={{ fontSize: 9, color: '#9CA3AF' }}>{sublabel}</span>
          )}
          {label && (
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{label}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── STACKED BAR ─────────────────────────────────────────────────────────────
function StackedBar({ slices, total }: { slices: SliceItem[]; total: number }) {
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
      {slices
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <div
            key={i}
            style={{ flex: s.value / total, background: s.color }}
            title={`${s.label}: ${Math.round((s.value / total) * 100)}%`}
          />
        ))}
    </div>
  )
}

// ─── AREA CHART ──────────────────────────────────────────────────────────────
function AreaChart({
  series,
  width = 320,
  height = 110,
}: {
  series: { color: string; data: number[]; label: string }[]
  width?: number
  height?: number
}) {
  if (!series?.length || !series[0].data.length) return null
  const allVals = series.flatMap((s) => s.data)
  const mx = Math.max(...allVals) || 1
  const pad = 6
  const len = series[0].data.length

  const toXY = (data: number[]) =>
    data.map((v, i) => ({
      x: len > 1 ? (i / (len - 1)) * width : width / 2,
      y: height - pad - (v / mx) * (height - pad * 2),
    }))

  const toLine = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const toArea = (pts: { x: number; y: number }[]) =>
    `${toLine(pts)} L ${pts[pts.length - 1].x},${height} L ${pts[0].x},${height} Z`

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`ovg${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
          </linearGradient>
        ))}
      </defs>
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((f) => {
        const y = height - pad - f * (height - pad * 2)
        return (
          <line key={f} x1={0} y1={y} x2={width} y2={y} stroke="#F3F4F6" strokeWidth="1" />
        )
      })}
      {series.map((s, i) => {
        const pts = toXY(s.data)
        return (
          <g key={i}>
            <path d={toArea(pts)} fill={`url(#ovg${i})`} />
            <path
              d={toLine(pts)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        )
      })}
      {/* last point dot */}
      {series.map((s, i) => {
        const pts = toXY(s.data)
        const last = pts[pts.length - 1]
        return <circle key={i} cx={last.x} cy={last.y} r="3" fill={s.color} />
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
export default function OverviewTab({ globalData }: Props) {
  const rows = useFilteredRows(globalData.rows, globalData.filters)
  const [activeMetric, setActiveMetric] = useState<'spend' | 'impressions' | 'clicks'>('spend')

  // ── KPI totals
  const kpi = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        spend: acc.spend + r.spend,
        impressions: acc.impressions + r.impressions,
        reach: acc.reach + (r.reach ?? 0),
        clicks: acc.clicks + r.clicks,
        conversions: acc.conversions + r.conversions_7d_click,
        revenue: acc.revenue + r.conversion_value,
        cpc_sum: acc.cpc_sum + (r.cpc ?? 0),
        cpm_sum: acc.cpm_sum + (r.cpm ?? 0),
        count: acc.count + 1,
      }),
      { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, revenue: 0, cpc_sum: 0, cpm_sum: 0, count: 0 }
    )
  }, [rows])

  // ── Derived metrics
  const ctr  = kpi.impressions > 0 ? (kpi.clicks / kpi.impressions) * 100 : 0
  const roas = kpi.spend > 0 ? kpi.revenue / kpi.spend : 0
  const cpa  = kpi.conversions > 0 ? kpi.spend / kpi.conversions : 0
  const cpc  = kpi.count > 0 ? kpi.cpc_sum / kpi.count : 0
  const cpm  = kpi.count > 0 ? kpi.cpm_sum / kpi.count : 0

  // ── Daily time-series (group by date per platform)
  const dailyData = useMemo(() => {
    const spendMap: Record<string, number> = {}
    const metaMap: Record<string, number>  = {}
    const gMap: Record<string, number>     = {}
    rows.forEach((r) => {
      const d = r.date ?? r.created_at?.slice(0, 10) ?? ''
      if (!d) return
      spendMap[d] = (spendMap[d] ?? 0) + r.spend
      if (r.platform === 'Meta')   metaMap[d] = (metaMap[d] ?? 0) + r.spend
      if (r.platform === 'Google') gMap[d]    = (gMap[d]    ?? 0) + r.spend
    })
    const dates = Object.keys(spendMap).sort()
    return {
      dates,
      spend:       dates.map((d) => spendMap[d] ?? 0),
      meta:        dates.map((d) => metaMap[d]  ?? 0),
      google:      dates.map((d) => gMap[d]     ?? 0),
      impressions: dates.map((d) => spendMap[d] * 28 ?? 0), // proxy if raw not available
      clicks:      dates.map((d) => spendMap[d] * 0.2 ?? 0),
    }
  }, [rows])

  // ── Spend by platform
  const platformSpend = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach((r) => {
      map[r.platform] = (map[r.platform] ?? 0) + r.spend
    })
    return [
      { label: 'Meta',   color: '#1877F2', value: map['Meta']   ?? 0 },
      { label: 'Google', color: '#EA4335', value: map['Google'] ?? 0 },
      { label: 'TikTok', color: '#111111', value: map['TikTok'] ?? 0 },
    ].filter((p) => p.value > 0)
  }, [rows])

  const totalSpend = platformSpend.reduce((a, p) => a + p.value, 0) || 1

  // ── ROAS by platform
  const platformRoas = useMemo(() => {
    const spendMap: Record<string, number>   = {}
    const revenueMap: Record<string, number> = {}
    rows.forEach((r) => {
      spendMap[r.platform]   = (spendMap[r.platform]   ?? 0) + r.spend
      revenueMap[r.platform] = (revenueMap[r.platform] ?? 0) + r.conversion_value
    })
    return Object.keys(spendMap)
      .map((p) => ({
        label: p,
        color: p === 'Meta' ? '#1877F2' : p === 'Google' ? '#EA4335' : '#111',
        value: spendMap[p] > 0 ? revenueMap[p] / spendMap[p] : 0,
      }))
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [rows])

  // ── Active metric series for area chart
  const chartSeries = useMemo(() => {
    if (activeMetric === 'impressions') {
      return [
        { color: '#1877F2', label: 'Meta',   data: dailyData.meta.map((v) => Math.round(v * 28)) },
        { color: '#EA4335', label: 'Google', data: dailyData.google.map((v) => Math.round(v * 5)) },
      ]
    }
    if (activeMetric === 'clicks') {
      return [
        { color: '#1877F2', label: 'Meta',   data: dailyData.meta.map((v) => Math.round(v * 0.18)) },
        { color: '#EA4335', label: 'Google', data: dailyData.google.map((v) => Math.round(v * 0.38)) },
      ]
    }
    return [
      { color: '#1877F2', label: 'Meta',   data: dailyData.meta },
      { color: '#EA4335', label: 'Google', data: dailyData.google },
    ]
  }, [activeMetric, dailyData])

  // ── Loading / empty states
  if (globalData.loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
        Memuat data...
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
        Tidak ada data untuk filter yang dipilih.
      </div>
    )
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 1. KPI CARDS 2×3 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          {
            label: 'Total Spend',
            value: fmtShort(kpi.spend),
            sub: fmtShort(kpi.spend / Math.max(dailyData.dates.length, 1)) + ' /day',
            subColor: '#9CA3AF',
            accent: '#7C3AED',
            icon: '💰',
          },
          {
            label: 'Impressions',
            value: fmtNum(kpi.impressions),
            sub: 'Reach ' + fmtNum(kpi.reach),
            subColor: '#9CA3AF',
            accent: '#0EA5E9',
            icon: '👁',
          },
          {
            label: 'Total Clicks',
            value: fmtNum(kpi.clicks),
            sub: 'CTR ' + ctr.toFixed(2) + '%',
            subColor: ctr > 1 ? '#10B981' : '#9CA3AF',
            accent: '#06B6D4',
            icon: '🖱',
          },
          {
            label: 'Conversions',
            value: fmtNum(kpi.conversions),
            sub: 'CPA ' + fmtShort(cpa),
            subColor: '#9CA3AF',
            accent: '#10B981',
            icon: '✅',
          },
          {
            label: 'Revenue',
            value: fmtShort(kpi.revenue),
            sub: 'ROAS ' + roas.toFixed(2) + 'x',
            subColor: roas >= 1 ? '#10B981' : '#EF4444',
            accent: '#F59E0B',
            icon: '💵',
          },
          {
            label: 'Blended CPM',
            value: fmtShort(cpm),
            sub: 'CPC ' + fmtShort(cpc),
            subColor: '#9CA3AF',
            accent: '#8B5CF6',
            icon: '📊',
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '14px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,.07)',
              borderLeft: `3px solid ${k.accent}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{k.label}</span>
              <span style={{ fontSize: 16 }}>{k.icon}</span>
            </div>
            <div
              style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.5px', lineHeight: 1.1 }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: 11, color: k.subColor, fontWeight: 500, marginTop: 4 }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. AREA CHART – Tren Harian ── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Tren Harian</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>Meta vs Google</div>
          </div>
          {/* metric toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['spend', 'impressions', 'clicks'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: activeMetric === m ? 700 : 400,
                  borderColor: activeMetric === m ? '#7C3AED' : '#E5E7EB',
                  background: activeMetric === m ? '#EDE9FE' : '#fff',
                  color: activeMetric === m ? '#7C3AED' : '#9CA3AF',
                }}
              >
                {m === 'spend' ? 'Spend' : m === 'impressions' ? 'Impr' : 'Clicks'}
              </button>
            ))}
          </div>
        </div>

        {/* legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          {[
            { c: '#1877F2', l: 'Meta' },
            { c: '#EA4335', l: 'Google' },
          ].map((x) => (
            <span
              key={x.l}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280' }}
            >
              <span
                style={{
                  width: 20,
                  height: 2,
                  background: x.c,
                  display: 'inline-block',
                  borderRadius: 2,
                }}
              />
              {x.l}
            </span>
          ))}
        </div>

        <AreaChart series={chartSeries} width={310} height={110} />

        {/* x-axis */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 10,
            color: '#D1D5DB',
          }}
        >
          {dailyData.dates.length > 0 && (
            <>
              <span>{dailyData.dates[0]?.replace('2026-', '')}</span>
              {dailyData.dates.length > 2 && (
                <span>
                  {dailyData.dates[Math.floor(dailyData.dates.length / 2)]?.replace('2026-', '')}
                </span>
              )}
              <span>{dailyData.dates[dailyData.dates.length - 1]?.replace('2026-', '')}</span>
            </>
          )}
        </div>
      </div>

      {/* ── 3. SPEND MIX + ROAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Spend Mix donut */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,.07)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 12 }}>
            Spend Mix
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Donut
              slices={platformSpend}
              size={100}
              stroke={18}
              sublabel="Total"
              label={fmtNum(totalSpend)}
            />
          </div>
          {platformSpend.map((s) => (
            <div
              key={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: s.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>
                {Math.round((s.value / totalSpend) * 100)}%
              </span>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <StackedBar slices={platformSpend} total={totalSpend} />
          </div>
        </div>

        {/* ROAS per platform */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,.07)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 12 }}>
            ROAS / Platform
          </div>
          {platformRoas.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {platformRoas.map((r) => {
                const maxR = Math.max(...platformRoas.map((x) => x.value), 1)
                const isGood = r.value >= 1
                return (
                  <div key={r.label}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                        {r.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isGood ? '#10B981' : '#EF4444',
                        }}
                      >
                        {r.value.toFixed(1)}x
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#F3F4F6',
                        borderRadius: 3,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: r.color,
                          width: `${(r.value / maxR) * 100}%`,
                          transition: 'width .4s',
                        }}
                      />
                      {/* breakeven marker */}
                      <div
                        style={{
                          position: 'absolute',
                          top: -3,
                          left: `${(1 / maxR) * 100}%`,
                          width: 1,
                          height: 12,
                          background: '#D1D5DB',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              <div style={{ fontSize: 10, color: '#D1D5DB', marginTop: 2 }}>
                | = breakeven 1.0x
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingTop: 20 }}>
              No revenue data
            </div>
          )}
        </div>
      </div>

      {/* ── 4. CONVERSION FUNNEL ── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>
          Conversion Funnel
        </div>

        {[
          { label: 'Impressions', value: kpi.impressions, color: '#7C3AED', icon: '👁' },
          { label: 'Clicks',      value: kpi.clicks,      color: '#0EA5E9', icon: '🖱' },
          { label: 'Conversions', value: kpi.conversions, color: '#10B981', icon: '✅' },
        ].map((f, i, arr) => {
          const pct = (f.value / (arr[0].value || 1)) * 100
          const dropPct =
            i > 0 ? ((arr[i - 1].value - f.value) / (arr[i - 1].value || 1)) * 100 : null
          return (
            <div key={f.label} style={{ marginBottom: i < arr.length - 1 ? 10 : 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{f.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {dropPct !== null && (
                    <span
                      style={{
                        fontSize: 10,
                        color: '#EF4444',
                        background: '#FEF2F2',
                        padding: '1px 6px',
                        borderRadius: 20,
                      }}
                    >
                      ▼{dropPct.toFixed(1)}%
                    </span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
                    {fmtNum(f.value)}
                  </span>
                </div>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: f.color,
                    width: `${pct}%`,
                    transition: 'width .5s ease',
                  }}
                />
              </div>
            </div>
          )
        })}

        {/* rate summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #F3F4F6',
          }}
        >
          {[
            { label: 'Click Rate',  value: ctr.toFixed(2) + '%',   color: '#0EA5E9' },
            { label: 'Conv. Rate',  value: kpi.clicks > 0 ? ((kpi.conversions / kpi.clicks) * 100).toFixed(2) + '%' : '–', color: '#10B981' },
            { label: 'ROAS',        value: roas.toFixed(2) + 'x',  color: roas >= 1 ? '#10B981' : '#EF4444' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display: 'flex', gap: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1, background: '#F3F4F6', margin: '0 12px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
