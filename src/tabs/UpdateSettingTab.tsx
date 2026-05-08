import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface Campaign {
  id: string
  campaign_name: string
  platform_id: string
  platform_name: string
  objective: string
  status: string
  daily_budget: number | null
  lifetime_budget: number | null
  target_roas: number | null
  target_cpa: number | null
  start_date: string | null
  end_date: string | null
}

const PLATFORM_STYLE: Record<string, { bg: string; color: string }> = {
  Meta:   { bg: '#E6F1FB', color: '#185FA5' },
  Google: { bg: '#FCEBEB', color: '#A32D2D' },
  TikTok: { bg: '#F1EFE8', color: '#444441' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#EAF3DE', color: '#27500A' },
  Paused: { bg: '#FAEEDA', color: '#633806' },
  Ended:  { bg: '#F1EFE8', color: '#5F5E5A' },
}

const STATUS_OPTIONS = ['Active', 'Paused', 'Ended']
const PLATFORM_OPTIONS = ['All', 'Meta', 'Google', 'TikTok']
const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Paused', 'Ended']

function PlatformBadge({ name }: { name: string }) {
  const style = PLATFORM_STYLE[name] ?? { bg: '#f0f0f0', color: '#555' }
  return (
    <span style={{
      fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
      fontWeight: 500, background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? { bg: '#f0f0f0', color: '#555' }
  return (
    <span style={{
      fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
      fontWeight: 500, background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

function formatRp(value: number | null) {
  if (value == null) return '—'
  return 'Rp ' + value.toLocaleString('id-ID')
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return '—'
  const fmt = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
  }
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `${fmt(start)} –`
  return `– ${fmt(end!)}`
}

function LoadingRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{
            height: '12px', borderRadius: '4px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            width: i === 0 ? '140px' : i === 8 ? '60px' : '70px',
          }} />
        </td>
      ))}
    </tr>
  )
}

export default function UpdateSettingTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dim_campaigns')
      .select('*, dim_platforms(platform_name)')
      .order('campaign_name', { ascending: true })

    if (error) {
      showToast('Failed to load campaigns.', 'error')
      setLoading(false)
      return
    }

    const rows: Campaign[] = (data ?? []).map((row: Record<string, unknown>) => {
      const platforms = row.dim_platforms as { platform_name: string } | null
      return {
        id: row.id as string,
        campaign_name: row.campaign_name as string,
        platform_id: row.platform_id as string,
        platform_name: platforms?.platform_name ?? '—',
        objective: row.objective as string ?? '—',
        status: row.status as string ?? 'Active',
        daily_budget: row.daily_budget as number | null,
        lifetime_budget: row.lifetime_budget as number | null,
        target_roas: row.target_roas as number | null,
        target_cpa: row.target_cpa as number | null,
        start_date: row.start_date as string | null,
        end_date: row.end_date as string | null,
      }
    })

    setCampaigns(rows)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const handleStatusChange = async (id: string, newStatus: string) => {
    setSavingId(id)
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))

    const { error } = await supabase
      .from('dim_campaigns')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      showToast('Failed to update status.', 'error')
      fetchCampaigns()
    } else {
      showToast('Status updated.')
    }
    setSavingId(null)
  }

  const confirmDelete = (id: string, name: string) => {
    setDeleteId(id)
    setDeleteName(name)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    const { error } = await supabase
      .from('dim_campaigns')
      .delete()
      .eq('id', deleteId)

    if (error) {
      showToast('Failed to delete campaign.', 'error')
    } else {
      showToast('Campaign deleted.')
      setCampaigns(prev => prev.filter(c => c.id !== deleteId))
    }
    setDeleting(false)
    setDeleteId(null)
    setDeleteName('')
  }

  const filtered = campaigns.filter(c => {
    const matchSearch = c.campaign_name.toLowerCase().includes(search.toLowerCase())
    const matchPlatform = platformFilter === 'All' || c.platform_name === platformFilter
    const matchStatus = statusFilter === 'All' || c.status === statusFilter
    return matchSearch && matchPlatform && matchStatus
  })

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '11px', fontWeight: 500,
    color: '#888', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
    background: '#fafafa',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: '12px', color: '#1a1a1a',
    borderBottom: '0.5px solid rgba(0,0,0,0.05)', verticalAlign: 'middle',
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
          background: toast.type === 'success' ? '#EAF3DE' : '#FCEBEB',
          color: toast.type === 'success' ? '#27500A' : '#A32D2D',
          border: `0.5px solid ${toast.type === 'success' ? '#b6d98a' : '#f5b8b8'}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '24px 28px',
            border: '0.5px solid rgba(0,0,0,0.08)', minWidth: '320px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#1a1a1a' }}>
              Delete Campaign
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: '#1a1a1a' }}>{deleteName}</strong>?
              This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDeleteId(null); setDeleteName('') }}
                disabled={deleting}
                style={{
                  padding: '7px 14px', fontSize: '12px', borderRadius: '6px',
                  border: '0.5px solid rgba(0,0,0,0.18)', background: '#fff',
                  color: '#555', cursor: 'pointer', fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '7px 14px', fontSize: '12px', borderRadius: '6px',
                  border: 'none', background: '#A32D2D',
                  color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 500,
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
        borderRadius: '12px', padding: '16px 20px', marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>Campaign Settings</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              Manage status and review campaign configuration
            </div>
          </div>
          <button
            onClick={fetchCampaigns}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', fontSize: '12px', borderRadius: '6px',
              border: '0.5px solid rgba(0,0,0,0.18)', background: '#fff',
              color: '#1a1a1a', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500, opacity: loading ? 0.6 : 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.4s' }}>
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 3.89 1.61" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11 4.5h2.5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '280px' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              style={{
                width: '100%', padding: '7px 10px 7px 28px', fontSize: '12px',
                border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px',
                background: '#fafafa', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Platform filter */}
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            style={{
              padding: '7px 10px', fontSize: '12px',
              border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px',
              background: '#fafafa', color: '#1a1a1a', outline: 'none', cursor: 'pointer',
            }}
          >
            {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Platforms' : p}</option>)}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 10px', fontSize: '12px',
              border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px',
              background: '#fafafa', color: '#1a1a1a', outline: 'none', cursor: 'pointer',
            }}
          >
            {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>

          <span style={{ fontSize: '11px', color: '#aaa', marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `${filtered.length} campaign${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div style={{
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Campaign Name</th>
                <th style={thStyle}>Platform</th>
                <th style={thStyle}>Objective</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Budget</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Target ROAS</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Target CPA</th>
                <th style={thStyle}>Period</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => <LoadingRow key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <rect width="36" height="36" rx="8" fill="#f5f5f5"/>
                        <path d="M10 12h16M10 18h10M10 24h7" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>No campaigns found</div>
                      <div style={{ fontSize: '11px', color: '#bbb' }}>
                        {search || platformFilter !== 'All' || statusFilter !== 'All'
                          ? 'Try adjusting your search or filters.'
                          : 'Add a campaign using the Ads Setting tab.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.map(c => {
                const budget = c.daily_budget != null
                  ? `${formatRp(c.daily_budget)}/day`
                  : c.lifetime_budget != null
                    ? `${formatRp(c.lifetime_budget)} total`
                    : '—'

                const isSaving = savingId === c.id
                const statusStyle = STATUS_STYLE[c.status] ?? { bg: '#f0f0f0', color: '#555' }

                return (
                  <tr key={c.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Campaign Name */}
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '12px' }}>
                        {c.campaign_name}
                      </span>
                    </td>

                    {/* Platform */}
                    <td style={tdStyle}>
                      <PlatformBadge name={c.platform_name} />
                    </td>

                    {/* Objective */}
                    <td style={{ ...tdStyle, color: '#555' }}>{c.objective}</td>

                    {/* Status — inline editable dropdown */}
                    <td style={tdStyle}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <select
                          value={c.status}
                          onChange={e => handleStatusChange(c.id, e.target.value)}
                          disabled={isSaving}
                          style={{
                            appearance: 'none',
                            padding: '2px 22px 2px 8px',
                            fontSize: '10px', fontWeight: 500,
                            border: '0.5px solid transparent',
                            borderRadius: '99px',
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            outline: 'none',
                            opacity: isSaving ? 0.6 : 1,
                          }}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{
                          position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)',
                          pointerEvents: 'none', color: statusStyle.color,
                        }}>
                          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {isSaving && (
                        <span style={{ fontSize: '10px', color: '#aaa', marginLeft: '6px' }}>saving…</span>
                      )}
                    </td>

                    {/* Budget */}
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#555', whiteSpace: 'nowrap' }}>
                      {budget}
                    </td>

                    {/* Target ROAS */}
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#555' }}>
                      {c.target_roas != null ? `${c.target_roas}x` : '—'}
                    </td>

                    {/* Target CPA */}
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#555', whiteSpace: 'nowrap' }}>
                      {formatRp(c.target_cpa)}
                    </td>

                    {/* Period */}
                    <td style={{ ...tdStyle, color: '#555', whiteSpace: 'nowrap' }}>
                      {formatPeriod(c.start_date, c.end_date)}
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => confirmDelete(c.id, c.campaign_name)}
                        title="Delete campaign"
                        style={{
                          padding: '5px 8px', borderRadius: '6px', border: 'none',
                          background: 'transparent', cursor: 'pointer', color: '#bbb',
                          display: 'inline-flex', alignItems: 'center',
                          transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#A32D2D'
                          ;(e.currentTarget as HTMLButtonElement).style.background = '#FCEBEB'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#bbb'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l.5 8.5a1 1 0 0 0 1 .5h3a1 1 0 0 0 1-.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: '10px 20px', borderTop: '0.5px solid rgba(0,0,0,0.05)',
            fontSize: '11px', color: '#aaa', textAlign: 'right',
          }}>
            {filtered.length} of {campaigns.length} campaigns
          </div>
        )}
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLE).map(([label, _style]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <StatusBadge status={label} />
          </div>
        ))}
        <span style={{ fontSize: '10px', color: '#bbb', marginLeft: '4px' }}>
          · Click the status badge to change it inline
        </span>
      </div>
    </div>
  )
}
