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

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Active: { bg: '#EAF3DE', color: '#27500A', border: '#b6d98a' },
  Paused: { bg: '#FAEEDA', color: '#633806', border: '#f5ce8a' },
  Ended:  { bg: '#F1EFE8', color: '#5F5E5A', border: '#d0cfc9' },
}

const STATUS_OPTIONS = ['Active', 'Paused', 'Ended']
const PLATFORM_OPTIONS = ['All', 'Meta', 'Google', 'TikTok']
const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Paused', 'Ended']

const OBJECTIVES = [
  'Awareness', 'Reach', 'Traffic', 'Engagement',
  'Lead Generation', 'Msg/WA/DM', 'Get Direction',
  'Conversions', 'App Install', 'Video Views',
]

function PlatformBadge({ name }: { name: string }) {
  const s = PLATFORM_STYLE[name] ?? { bg: '#f0f0f0', color: '#555' }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 99,
      fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

function formatRp(value: number | null) {
  if (value == null) return '—'
  return 'Rp ' + value.toLocaleString('id-ID')
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return '—'
  const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
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
            height: 12, borderRadius: 4,
            background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
            width: i === 0 ? 140 : i === 8 ? 60 : 70,
          }} />
        </td>
      ))}
    </tr>
  )
}

// ─── INLINE STATUS CYCLE BUTTON ──────────────────────────────────────────────
// Replaces <select> which is unreliable on mobile Safari.
// Clicking cycles Active → Paused → Ended → Active.
function StatusCycleButton({
  status, saving, onChange,
}: { status: string; saving: boolean; onChange: (s: string) => void }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f0f0f0', color: '#555', border: '#ccc' }
  const next = () => {
    const idx = STATUS_OPTIONS.indexOf(status)
    onChange(STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length])
  }
  return (
    <button
      onClick={next}
      disabled={saving}
      title="Click to change status"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600,
        background: s.bg, color: s.color,
        border: `1px solid ${s.border}`,
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.6 : 1,
        transition: 'all .15s',
        userSelect: 'none',
        // Explicit pointer-events so mobile doesn't ignore it
        pointerEvents: saving ? 'none' : 'auto',
      }}
    >
      {saving ? '…' : status}
      {!saving && (
        <svg width="7" height="7" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({
  campaign,
  onClose,
  onSaved,
}: { campaign: Campaign; onClose: () => void; onSaved: (updated: Campaign) => void }) {
  const [form, setForm] = useState({
    campaign_name: campaign.campaign_name,
    objective: campaign.objective,
    status: campaign.status,
    daily_budget: campaign.daily_budget?.toString() ?? '',
    lifetime_budget: campaign.lifetime_budget?.toString() ?? '',
    target_roas: campaign.target_roas?.toString() ?? '',
    target_cpa: campaign.target_cpa?.toString() ?? '',
    start_date: campaign.start_date ?? '',
    end_date: campaign.end_date ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.campaign_name.trim()) { setError('Nama campaign wajib diisi.'); return }
    setSaving(true); setError('')

    const payload = {
      campaign_name: form.campaign_name.trim(),
      objective: form.objective,
      status: form.status,
      daily_budget: form.daily_budget ? parseFloat(form.daily_budget) : null,
      lifetime_budget: form.lifetime_budget ? parseFloat(form.lifetime_budget) : null,
      target_roas: form.target_roas ? parseFloat(form.target_roas) : null,
      target_cpa: form.target_cpa ? parseFloat(form.target_cpa) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }

    const { error: err } = await supabase
      .from('dim_campaigns')
      .update(payload)
      .eq('id', campaign.id)

    if (err) { setError(err.message); setSaving(false); return }

    onSaved({ ...campaign, ...payload })
    setSaving(false)
    onClose()
  }

  const f: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6,
    fontSize: 12, outline: 'none', background: '#fafafa', color: '#1a1a1a',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 600,
    color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Edit Campaign</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{campaign.platform_name}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Campaign name */}
          <div>
            <label style={lbl}>Nama Campaign *</label>
            <input value={form.campaign_name} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))} style={f} />
          </div>

          {/* Objective + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Objective</label>
              <select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} style={f}>
                {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...f, background: STATUS_STYLE[form.status]?.bg || '#fafafa', color: STATUS_STYLE[form.status]?.color || '#1a1a1a' }}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Budget */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Daily Budget (Rp)</label>
              <input type="number" value={form.daily_budget} onChange={e => setForm(f => ({ ...f, daily_budget: e.target.value }))} style={f} placeholder="e.g. 500000" />
            </div>
            <div>
              <label style={lbl}>Lifetime Budget (Rp)</label>
              <input type="number" value={form.lifetime_budget} onChange={e => setForm(f => ({ ...f, lifetime_budget: e.target.value }))} style={f} placeholder="e.g. 5000000" />
            </div>
          </div>

          {/* Target ROAS + CPA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Target ROAS (x)</label>
              <input type="number" step="0.1" value={form.target_roas} onChange={e => setForm(f => ({ ...f, target_roas: e.target.value }))} style={f} placeholder="e.g. 3.5" />
            </div>
            <div>
              <label style={lbl}>Target CPA (Rp)</label>
              <input type="number" value={form.target_cpa} onChange={e => setForm(f => ({ ...f, target_cpa: e.target.value }))} style={f} placeholder="e.g. 25000" />
            </div>
          </div>

          {/* Period */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={f} />
            </div>
            <div>
              <label style={lbl}>End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={f} />
            </div>
          </div>

          {error && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #f5b8b8', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#A32D2D' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px', fontSize: 12, borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.18)', background: '#fff', cursor: 'pointer', color: '#555' }}>
              Batal
            </button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '9px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', background: saving ? '#aaa' : '#1a1a1a', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function UpdateSettingTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Edit state
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)

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

    if (error) { showToast('Failed to load campaigns.', 'error'); setLoading(false); return }

    const rows: Campaign[] = (data ?? []).map((row: Record<string, unknown>) => {
      const platforms = row.dim_platforms as { platform_name: string } | null
      return {
        id: row.id as string,
        campaign_name: row.campaign_name as string,
        platform_id: row.platform_id as string,
        platform_name: platforms?.platform_name ?? '—',
        objective: (row.objective as string) ?? '—',
        status: (row.status as string) ?? 'Active',
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

  // ── Status change ────────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: string) => {
    setSavingId(id)
    // Optimistic update
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))

    const { error } = await supabase
      .from('dim_campaigns')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      showToast('Gagal update status.', 'error')
      fetchCampaigns() // rollback
    } else {
      showToast(`Status diubah ke "${newStatus}".`)
    }
    setSavingId(null)
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
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
      showToast('Gagal menghapus campaign.', 'error')
    } else {
      showToast('Campaign berhasil dihapus.')
      setCampaigns(prev => prev.filter(c => c.id !== deleteId))
    }

    setDeleting(false)
    setDeleteId(null)
    setDeleteName('')
  }

  // ── Edit saved ───────────────────────────────────────────────────────────────
  const handleEditSaved = (updated: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
    showToast('Campaign berhasil diupdate.')
  }

  const filtered = campaigns.filter(c => {
    const matchSearch = c.campaign_name.toLowerCase().includes(search.toLowerCase())
    const matchPlatform = platformFilter === 'All' || c.platform_name === platformFilter
    const matchStatus = statusFilter === 'All' || c.status === statusFilter
    return matchSearch && matchPlatform && matchStatus
  })

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#888',
    textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafafa',
  }
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: 12, color: '#1a1a1a',
    borderBottom: '0.5px solid rgba(0,0,0,0.05)', verticalAlign: 'middle',
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .row-hover:hover { background: #fafafa !important; }
        .del-btn:hover { color: #A32D2D !important; background: #FCEBEB !important; }
        .edit-btn:hover { color: #185FA5 !important; background: #E6F1FB !important; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: toast.type === 'success' ? '#EAF3DE' : '#FCEBEB',
          color: toast.type === 'success' ? '#27500A' : '#A32D2D',
          border: `0.5px solid ${toast.type === 'success' ? '#b6d98a' : '#f5b8b8'}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          transition: 'all .2s',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editCampaign && (
        <EditModal
          campaign={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { if (!deleting) { setDeleteId(null); setDeleteName('') } }}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', minWidth: 300, maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1a1a1a' }}>Hapus Campaign</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
              Hapus <strong style={{ color: '#1a1a1a' }}>{deleteName}</strong>?{' '}
              Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data yang terkait.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDeleteId(null); setDeleteName('') }}
                disabled={deleting}
                style={{ padding: '7px 14px', fontSize: 12, borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.18)', background: '#fff', color: '#555', cursor: 'pointer', fontWeight: 500 }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '7px 16px', fontSize: 12, borderRadius: 6, border: 'none', background: '#A32D2D', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header + Filters ── */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Campaign Settings</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Manage status and review campaign configuration</div>
          </div>
          <button
            onClick={fetchCampaigns}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.18)', background: '#fff', color: '#1a1a1a', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.6 : 1 }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 3.89 1.61" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11 4.5h2.5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              style={{ width: '100%', padding: '7px 10px 7px 28px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, background: '#fafafa', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, background: '#fafafa', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}>
            {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Platforms' : p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, background: '#fafafa', color: '#1a1a1a', outline: 'none', cursor: 'pointer' }}>
            {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
          <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `${filtered.length} campaign${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <rect width="36" height="36" rx="8" fill="#f5f5f5"/>
                        <path d="M10 12h16M10 18h10M10 24h7" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>No campaigns found</div>
                      <div style={{ fontSize: 11, color: '#bbb' }}>
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

                return (
                  <tr key={c.id} className="row-hover" style={{ background: 'transparent', transition: 'background .15s' }}>
                    {/* Campaign Name */}
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{c.campaign_name}</span>
                    </td>

                    {/* Platform */}
                    <td style={tdStyle}><PlatformBadge name={c.platform_name} /></td>

                    {/* Objective */}
                    <td style={{ ...tdStyle, color: '#555' }}>{c.objective}</td>

                    {/* Status — reliable cycle button, no <select> */}
                    <td style={tdStyle}>
                      <StatusCycleButton
                        status={c.status}
                        saving={isSaving}
                        onChange={newStatus => handleStatusChange(c.id, newStatus)}
                      />
                    </td>

                    {/* Budget */}
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#555', whiteSpace: 'nowrap' }}>{budget}</td>

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

                    {/* Actions — Edit + Delete */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        {/* Edit button */}
                        <button
                          className="edit-btn"
                          onClick={() => setEditCampaign(c)}
                          title="Edit campaign"
                          style={{
                            padding: '5px 7px', borderRadius: 6, border: 'none',
                            background: 'transparent', cursor: 'pointer', color: '#bbb',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color .15s, background .15s',
                            // Explicit to avoid mobile tap blocking
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2.5a1.5 1.5 0 0 1 2.121 2.121L5 13.243 2 14l.757-3L11.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>

                        {/* Delete button */}
                        <button
                          className="del-btn"
                          onClick={() => confirmDelete(c.id, c.campaign_name)}
                          title="Delete campaign"
                          style={{
                            padding: '5px 7px', borderRadius: 6, border: 'none',
                            background: 'transparent', cursor: 'pointer', color: '#bbb',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color .15s, background .15s',
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l.5 8.5a1 1 0 0 0 1 .5h3a1 1 0 0 0 1-.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '0.5px solid rgba(0,0,0,0.05)', fontSize: 11, color: '#aaa', textAlign: 'right' }}>
            {filtered.length} of {campaigns.length} campaigns
          </div>
        )}
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(STATUS_STYLE).map(([label, s]) => (
          <span key={label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {label}
          </span>
        ))}
        <span style={{ fontSize: 10, color: '#bbb', marginLeft: 4 }}>
          · Klik badge status untuk ganti langsung
        </span>
      </div>
    </div>
  )
}
