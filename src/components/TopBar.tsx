import { useState, useEffect, useRef } from ‘react’
import { supabase } from ‘../lib/supabase’
import type { PlatformFilter, PeriodFilter, FilterState, DateRange } from ‘../types/global’

interface Props {
onSignOut?: () => void
userEmail?: string
role?: string
onClientChange?: (clientId: string) => void
selectedClient?: string
onFilterChange?: (filters: FilterState) => void
filters?: FilterState
}

const platforms: PlatformFilter[] = [‘All’, ‘Meta’, ‘Google’, ‘TikTok’]
const periods: PeriodFilter[] = [‘Last 7 days’, ‘Last 30 days’, ‘Custom’]

function roleBadge(role: string) {
const map: Record<string, { bg: string; color: string }> = {
founder: { bg: ‘#EEEDFE’, color: ‘#534AB7’ },
admin: { bg: ‘#E6F1FB’, color: ‘#185FA5’ },
client: { bg: ‘#EAF3DE’, color: ‘#27500A’ },
}
const s = map[role] ?? map[‘client’]
return (
<span
style={{
fontSize: ‘10px’,
padding: ‘2px 8px’,
borderRadius: ‘99px’,
fontWeight: 500,
background: s.bg,
color: s.color,
}}
>
{role}
</span>
)
}

function getDateRangeForPeriod(period: PeriodFilter): DateRange | null {
if (period === ‘Custom’) return null
const to = new Date()
const from = new Date()
if (period === ‘Last 7 days’) from.setDate(to.getDate() - 6)
if (period === ‘Last 30 days’) from.setDate(to.getDate() - 29)
return {
from: from.toISOString().slice(0, 10),
to: to.toISOString().slice(0, 10),
}
}

export default function TopBar({
onSignOut,
userEmail,
role,
onClientChange,
selectedClient,
onFilterChange,
filters,
}: Props) {
const canSeeAllClients = role === ‘founder’ || role === ‘admin’
const [clients, setClients] = useState<{ client_id: string; client_name: string }[]>([])
const [showCustomPicker, setShowCustomPicker] = useState(false)
const [customFrom, setCustomFrom] = useState(’’)
const [customTo, setCustomTo] = useState(’’)
const [signOutHovered, setSignOutHovered] = useState(false)
const pickerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
if (filters?.dateRange) {
setCustomFrom(filters.dateRange.from)
setCustomTo(filters.dateRange.to)
}
}, [])

useEffect(() => {
if (!canSeeAllClients) return
supabase
.from(‘dim_clients’)
.select(‘client_id, client_name’)
.eq(‘is_active’, true)
.order(‘client_name’)
.then(({ data }) => {
if (data) setClients(data)
})
}, [role])

useEffect(() => {
const handler = (e: Event) => {
if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
setShowCustomPicker(false)
}
}
document.addEventListener(‘mousedown’, handler)
return () => document.removeEventListener(‘mousedown’, handler)
}, [])

const activePlatform = filters?.platform ?? ‘All’
const activePeriod = filters?.period ?? ‘Last 30 days’

const emitFilter = (patch: Partial<FilterState>) => {
const current: FilterState = filters ?? {
platform: ‘All’,
period: ‘Last 30 days’,
dateRange: getDateRangeForPeriod(‘Last 30 days’),
}
onFilterChange?.({ …current, …patch })
}

const handlePlatform = (p: PlatformFilter) => {
emitFilter({ platform: p })
}

const handlePeriod = (p: PeriodFilter) => {
if (p === ‘Custom’) {
setShowCustomPicker(true)
emitFilter({ period: ‘Custom’, dateRange: null })
} else {
setShowCustomPicker(false)
emitFilter({ period: p, dateRange: getDateRangeForPeriod(p) })
}
}

const applyCustomRange = () => {
if (!customFrom || !customTo || customFrom > customTo) return
emitFilter({ period: ‘Custom’, dateRange: { from: customFrom, to: customTo } })
setShowCustomPicker(false)
}

const btnStyle = (active: boolean): React.CSSProperties => ({
fontSize: ‘11px’,
padding: ‘4px 10px’,
borderRadius: ‘99px’,
border: ‘0.5px solid #d1d1d1’,
background: active ? ‘#185FA5’ : ‘#fff’,
color: active ? ‘#fff’ : ‘#666’,
cursor: ‘pointer’,
transition: ‘all 0.15s’,
})

const isCustomInvalid = !customFrom || !customTo || customFrom > customTo

return (
<div
style={{
background: ‘#ffffff’,
borderBottom: ‘0.5px solid rgba(0,0,0,0.1)’,
padding: ‘10px 20px’,
display: ‘flex’,
alignItems: ‘center’,
justifyContent: ‘space-between’,
flexWrap: ‘wrap’,
gap: ‘10px’,
position: ‘sticky’,
top: 0,
zIndex: 100,
}}
>
{/* Logo */}
<div style={{ fontSize: ‘15px’, fontWeight: 500, color: ‘#1a1a1a’ }}>
Ads<span style={{ color: ‘#185FA5’ }}>Dash</span>
<span style={{ color: ‘#888’, fontWeight: 400, marginLeft: ‘8px’, fontSize: ‘13px’ }}>
Omnichannel
</span>
</div>

```
  {/* Filters */}
  <div
    style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      alignItems: 'center',
      position: 'relative',
    }}
  >
    {canSeeAllClients && (
      <>
        <span style={{ fontSize: '11px', color: '#888' }}>Client:</span>
        <select
          value={selectedClient ?? 'all'}
          onChange={(e) => onClientChange?.(e.target.value)}
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '99px',
            border: '0.5px solid #d1d1d1',
            background: selectedClient && selectedClient !== 'all' ? '#185FA5' : '#fff',
            color: selectedClient && selectedClient !== 'all' ? '#fff' : '#666',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="all">All Clients</option>
          {clients.map((c) => (
            <option key={c.client_id} value={c.client_id}>
              {c.client_name}
            </option>
          ))}
        </select>
      </>
    )}

    <span style={{ fontSize: '11px', color: '#888' }}>Platform:</span>
    {platforms.map((p) => (
      <button key={p} onClick={() => handlePlatform(p)} style={btnStyle(activePlatform === p)}>
        {p}
      </button>
    ))}

    <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>Period:</span>
    {periods.map((p) => (
      <button key={p} onClick={() => handlePeriod(p)} style={btnStyle(activePeriod === p)}>
        {p === 'Custom' && filters?.dateRange
          ? filters.dateRange.from + ' - ' + filters.dateRange.to
          : p}
      </button>
    ))}

    {showCustomPicker && (
      <div
        ref={pickerRef}
        style={{
          position: 'absolute',
          top: '36px',
          right: 0,
          background: '#fff',
          border: '0.5px solid #d1d1d1',
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '260px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a' }}>
          Pilih Rentang Tanggal
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>Dari</div>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '5px 8px',
                border: '0.5px solid #d1d1d1',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>Sampai</div>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '5px 8px',
                border: '0.5px solid #d1d1d1',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>
        </div>
        {!isCustomInvalid ? null : customFrom && customTo && customFrom > customTo ? (
          <div style={{ fontSize: '10px', color: '#e53935' }}>
            Tanggal awal tidak boleh setelah tanggal akhir
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowCustomPicker(false)}
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '0.5px solid #d1d1d1',
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={applyCustomRange}
            disabled={isCustomInvalid}
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              background: isCustomInvalid ? '#ccc' : '#185FA5',
              color: '#fff',
              cursor: isCustomInvalid ? 'not-allowed' : 'pointer',
            }}
          >
            Terapkan
          </button>
        </div>
      </div>
    )}
  </div>

  {/* User Info */}
  {userEmail && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {role && roleBadge(role)}
      <span style={{ fontSize: '11px', color: '#888' }}>{userEmail}</span>
      <button
        onClick={onSignOut}
        onMouseEnter={() => setSignOutHovered(true)}
        onMouseLeave={() => setSignOutHovered(false)}
        style={{
          fontSize: '11px',
          padding: '5px 12px',
          borderRadius: '6px',
          border: signOutHovered ? '0.5px solid #e53935' : '0.5px solid #d1d1d1',
          background: signOutHovered ? '#fff0f0' : '#fff',
          color: signOutHovered ? '#e53935' : '#666',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        Sign out
      </button>
    </div>
  )}
</div>
```

)
}
