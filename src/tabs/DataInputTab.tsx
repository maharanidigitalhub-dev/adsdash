import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Client {
  client_id: string
  client_name: string
  business_type: string | null
  contact_email: string | null
}

interface Campaign {
  campaign_id: string
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

interface PerformanceForm {
  client_id: string
  platform: string
  campaign_id: string
  report_date: string
  impressions: string
  reach: string
  clicks: string
  spend: string
  conversions_7d_click: string
  conversion_value: string
  purchases: string
}

interface RecentRecord {
  record_id: number
  report_date: string
  spend: number
  impressions: number
  clicks: number
  conversions_7d_click: number
  conversion_value: number
  dim_campaigns: { campaign_name: string } | { campaign_name: string }[]
  dim_platforms: { platform_name: string } | { platform_name: string }[]
}

interface CsvRow {
  report_date?: string
  date?: string
  impressions?: string
  reach?: string
  clicks?: string
  spend?: string
  conversions_7d_click?: string
  conversions?: string
  conversion_value?: string
  revenue?: string
  purchases?: string
  campaign_name?: string
  platform?: string
  client_name?: string
  [key: string]: string | undefined
}

// Platform detected per CSV row (overrideable by user)
interface CsvRowWithPlatform extends CsvRow {
  _resolvedPlatform: string
}

const emptyForm: PerformanceForm = {
  client_id: '', platform: '', campaign_id: '', report_date: '',
  impressions: '', reach: '', clicks: '', spend: '',
  conversions_7d_click: '', conversion_value: '', purchases: '',
}

const PLATFORMS = ['Meta', 'Google', 'TikTok']

const PLATFORM_STYLE: Record<string, { bg: string; color: string; active: string }> = {
  Meta:   { bg: '#E6F1FB', color: '#185FA5', active: '#185FA5' },
  Google: { bg: '#FCEBEB', color: '#A32D2D', active: '#A32D2D' },
  TikTok: { bg: '#F1EFE8', color: '#444441', active: '#444441' },
}

// Detect platform from campaign name prefix
function detectPlatformFromName(name: string): string | null {
  const n = (name || '').toUpperCase()
  if (n.includes('_GAD_') || n.startsWith('GAD_') || n.includes('GAD')) return 'Google'
  if (n.includes('_TT_') || n.startsWith('TT_') || n.includes('_TT')) return 'TikTok'
  if (n.includes('_FB_') || n.includes('_META_') || n.startsWith('FB_')) return 'Meta'
  return null
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <label style={{ fontSize: '11px', fontWeight: 500, color: '#555', display: 'block', marginBottom: '4px' }}>
      {children}{required && <span style={{ color: '#E24B4A', marginLeft: '2px' }}>*</span>}
    </label>
  )
}

function Input({ value, onChange, type = 'text', placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }} />
  )
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      {title && <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', marginBottom: '16px', paddingBottom: '10px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>{title}</div>}
      {children}
    </div>
  )
}

function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', color: value ? '#1a1a1a' : '#888', outline: 'none' }}>
      <option value="">{placeholder || '— Pilih —'}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function platformBadge(p: string) {
  const s = PLATFORM_STYLE[p] || { bg: '#F1EFE8', color: '#444441' }
  return <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>{p || '—'}</span>
}

// Compact platform toggle buttons (reused in multiple places)
function PlatformToggle({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {PLATFORMS.map(p => {
        const s = PLATFORM_STYLE[p]
        const isActive = value === p
        return (
          <button key={p} onClick={() => onChange(p)}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
              fontWeight: isActive ? 600 : 400,
              border: isActive ? `1.5px solid ${s.active}` : '0.5px solid rgba(0,0,0,0.12)',
              background: isActive ? s.bg : '#fff',
              color: isActive ? s.color : '#555',
              transition: 'all 0.12s',
            }}>
            {p}
          </button>
        )
      })}
    </div>
  )
}

export default function DataInputTab() {
  const [clients, setClients] = useState<Client[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState<PerformanceForm>(emptyForm)
  const [recentData, setRecentData] = useState<RecentRecord[]>([])
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', business_type: '', contact_email: '', contact_phone: '' })
  const [savingClient, setSavingClient] = useState(false)

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<CsvRowWithPlatform[]>([])
  const [csvPreview, setCsvPreview] = useState<{ matched: number; newCampaigns: string[]; rows: CsvRowWithPlatform[] }>({ matched: 0, newCampaigns: [], rows: [] })
  const [loadingCsv, setLoadingCsv] = useState(false)
  const [analyzingCsv, setAnalyzingCsv] = useState(false)
  const [csvClientId, setCsvClientId] = useState('')
  // Default platform for CSV rows that can't be auto-detected
  const [csvDefaultPlatform, setCsvDefaultPlatform] = useState('Meta')

  useEffect(() => { fetchClients(); fetchRecentData() }, [])

  useEffect(() => {
    if (form.client_id && form.platform) fetchCampaigns(form.client_id, form.platform)
    else setCampaigns([])
  }, [form.client_id, form.platform])

  const fetchClients = async () => {
    const { data } = await supabase.from('dim_clients').select('*').eq('is_active', true).order('client_name')
    if (data) setClients(data)
  }

  const fetchCampaigns = async (clientId: string, platform: string) => {
    const { data: platformData } = await supabase.from('dim_platforms').select('platform_id').eq('platform_name', platform).single()
    if (!platformData) return
    const { data } = await supabase
      .from('dim_campaigns')
      .select('campaign_id, campaign_name, platform_id, dim_platforms(platform_name)')
      .eq('client_id', clientId)
      .eq('platform_id', platformData.platform_id)
      .eq('status', 'Active')
    if (data) setCampaigns(data as unknown as Campaign[])
  }

  const fetchRecentData = async () => {
    setLoadingRecent(true)
    const { data } = await supabase
      .from('fact_daily_performance')
      .select('record_id, report_date, spend, impressions, clicks, conversions_7d_click, conversion_value, dim_campaigns(campaign_name), dim_platforms(platform_name)')
      .order('report_date', { ascending: false })
      .limit(30)
    if (data) setRecentData(data as unknown as RecentRecord[])
    setLoadingRecent(false)
  }

  const handleAddClient = async () => {
    if (!newClient.name.trim()) { setErrorMsg('Nama client wajib diisi'); return }
    setSavingClient(true)
    const { data, error } = await supabase.from('dim_clients').insert({
      client_name: newClient.name,
      business_type: newClient.business_type || null,
      contact_email: newClient.contact_email || null,
      contact_phone: newClient.contact_phone || null,
    }).select().single()
    if (error) { setErrorMsg('Gagal tambah client: ' + error.message) }
    else {
      setSuccessMsg(`Client "${newClient.name}" berhasil ditambahkan!`)
      setNewClient({ name: '', business_type: '', contact_email: '', contact_phone: '' })
      setShowAddClient(false)
      fetchClients()
      if (data) setForm(f => ({ ...f, client_id: data.client_id }))
    }
    setSavingClient(false)
  }

  const handleManualSubmit = async () => {
    if (!form.client_id || !form.platform || !form.campaign_id || !form.report_date || !form.spend) {
      setErrorMsg('Client, platform, campaign, tanggal, dan spend wajib diisi')
      return
    }
    setLoadingSubmit(true)
    setErrorMsg('')
    setSuccessMsg('')
    const { data: platformData } = await supabase.from('dim_platforms').select('platform_id').eq('platform_name', form.platform).single()
    const { error } = await supabase.from('fact_daily_performance').insert({
      campaign_id: form.campaign_id,
      platform_id: platformData?.platform_id,
      client_id: form.client_id,
      report_date: form.report_date,
      impressions: Number(form.impressions) || 0,
      reach: Number(form.reach) || 0,
      clicks: Number(form.clicks) || 0,
      spend: Number(form.spend) || 0,
      conversions_7d_click: Number(form.conversions_7d_click) || 0,
      conversion_value: Number(form.conversion_value) || 0,
      purchases: Number(form.purchases) || 0,
    })
    if (error) setErrorMsg('Gagal simpan: ' + error.message)
    else {
      setSuccessMsg('Data performa berhasil disimpan!')
      setForm(emptyForm)
      fetchRecentData()
    }
    setLoadingSubmit(false)
  }

  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const obj: CsvRow = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    }).filter(row => Object.values(row).some(v => v !== ''))
  }

  // Update _resolvedPlatform for all rows that don't have a CSV-column platform
  // when csvDefaultPlatform changes
  const updateRowPlatforms = (rows: CsvRowWithPlatform[], defaultPlatform: string): CsvRowWithPlatform[] => {
    return rows.map(row => {
      const csvPlatform = row.platform?.trim()
      const detected = detectPlatformFromName(row.campaign_name || '')
      // Priority: explicit CSV column > name detection > user-selected default
      const resolved = (csvPlatform && PLATFORMS.includes(csvPlatform)) ? csvPlatform
        : detected ? detected
        : defaultPlatform
      return { ...row, _resolvedPlatform: resolved }
    })
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    setErrorMsg('')
    setSuccessMsg('')
    setAnalyzingCsv(true)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target?.result as string
      const rawRows = parseCsv(text)

      // Resolve platforms for each row
      const resolvedRows: CsvRowWithPlatform[] = rawRows.map(row => {
        const csvPlatform = row.platform?.trim()
        const detected = detectPlatformFromName(row.campaign_name || '')
        const resolved = (csvPlatform && PLATFORMS.includes(csvPlatform)) ? csvPlatform
          : detected ? detected
          : csvDefaultPlatform
        return { ...row, _resolvedPlatform: resolved }
      })

      setCsvRows(resolvedRows)

      const campaignNames = [...new Set(resolvedRows.map(r => r.campaign_name).filter(Boolean))]
      const { data: allCampaigns } = await supabase
        .from('dim_campaigns')
        .select('campaign_id, campaign_name')

      const newCampaigns: string[] = []
      campaignNames.forEach(name => {
        const found = allCampaigns?.find(c => c.campaign_name?.toLowerCase() === name?.toLowerCase())
        if (!found) newCampaigns.push(name as string)
      })

      setCsvPreview({ matched: resolvedRows.length, newCampaigns, rows: resolvedRows.slice(0, 5) })
      setAnalyzingCsv(false)
    }
    reader.readAsText(file)
  }

  // When default platform changes, re-resolve all rows
  const handleDefaultPlatformChange = (p: string) => {
    setCsvDefaultPlatform(p)
    if (csvRows.length > 0) {
      const updated = updateRowPlatforms(csvRows, p)
      setCsvRows(updated)
      setCsvPreview(prev => ({ ...prev, rows: updated.slice(0, 5) }))
    }
  }

  // Allow user to override platform for a specific preview row
  const handleRowPlatformOverride = (rowIndex: number, newPlatform: string) => {
    setCsvRows(prev => {
      const updated = [...prev]
      updated[rowIndex] = { ...updated[rowIndex], _resolvedPlatform: newPlatform }
      return updated
    })
    setCsvPreview(prev => ({
      ...prev,
      rows: prev.rows.map((r, i) => i === rowIndex ? { ...r, _resolvedPlatform: newPlatform } : r),
    }))
  }

  const handleCsvImport = async () => {
    if (csvRows.length === 0) { setErrorMsg('Tidak ada data CSV'); return }
    if (!csvClientId) { setErrorMsg('Pilih client untuk import CSV ini'); return }
    setLoadingCsv(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { data: allCampaigns } = await supabase
      .from('dim_campaigns')
      .select('campaign_id, campaign_name, client_id, platform_id')

    const { data: allPlatforms } = await supabase
      .from('dim_platforms')
      .select('platform_id, platform_name')

    const campaignCache: Record<string, string> = {}
    allCampaigns?.forEach(c => {
      campaignCache[c.campaign_name?.toLowerCase()] = c.campaign_id
    })

    const errors: string[] = []
    const rowsToInsert: Record<string, unknown>[] = []

    for (const row of csvRows) {
      const campaignName = row.campaign_name?.trim() || ''
      const reportDate = row.report_date || row.date || ''
      // Use the resolved platform (from CSV column, name detection, or default)
      const platformName = row._resolvedPlatform || csvDefaultPlatform

      if (!campaignName) { errors.push('Baris tanpa campaign_name dilewati'); continue }
      if (!reportDate) { errors.push('Baris tanpa tanggal dilewati'); continue }

      let campaignId = campaignCache[campaignName.toLowerCase()]

      if (!campaignId) {
        // Auto-create campaign with the correctly resolved platform
        const platform = allPlatforms?.find(p =>
          p.platform_name?.toLowerCase() === platformName.toLowerCase()
        ) || allPlatforms?.find(p => p.platform_name === 'Meta')

        if (!platform) { errors.push(`Platform tidak ditemukan untuk "${campaignName}"`); continue }

        const { data: newCampaign, error: campErr } = await supabase
          .from('dim_campaigns')
          .insert({
            campaign_name: campaignName,
            platform_id: platform.platform_id,
            client_id: csvClientId,
            objective: 'Traffic',
            status: 'Active',
            budget_type: 'daily',
          })
          .select()
          .single()

        if (campErr || !newCampaign) {
          errors.push(`Gagal buat campaign "${campaignName}": ${campErr?.message}`)
          continue
        }

        campaignId = newCampaign.campaign_id
        campaignCache[campaignName.toLowerCase()] = campaignId
      }

      const platform = allPlatforms?.find(p =>
        p.platform_name?.toLowerCase() === platformName.toLowerCase()
      ) || allPlatforms?.[0]

      rowsToInsert.push({
        campaign_id: campaignId,
        platform_id: platform?.platform_id,
        client_id: csvClientId,
        report_date: reportDate,
        impressions: Number(row.impressions) || 0,
        reach: Number(row.reach) || 0,
        clicks: Number(row.clicks) || 0,
        spend: Number(row.spend) || 0,
        conversions_7d_click: Number(row.conversions_7d_click) || Number(row.conversions) || 0,
        conversion_value: Number(row.conversion_value) || Number(row.revenue) || 0,
        purchases: Number(row.purchases) || 0,
      })
    }

    if (rowsToInsert.length === 0) {
      setErrorMsg('Tidak ada baris valid. ' + errors.slice(0, 3).join(', '))
      setLoadingCsv(false)
      return
    }

    const { error } = await supabase.from('fact_daily_performance').insert(rowsToInsert)
    if (error) {
      setErrorMsg('Gagal import: ' + error.message)
    } else {
      const skipped = csvRows.length - rowsToInsert.length
      setSuccessMsg(`${rowsToInsert.length} baris berhasil diimport!${skipped > 0 ? ` (${skipped} dilewati)` : ''}`)
      setCsvFile(null)
      setCsvRows([])
      setCsvPreview({ matched: 0, newCampaigns: [], rows: [] })
      setCsvClientId('')
      fetchRecentData()
    }
    setLoadingCsv(false)
  }

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Hapus record ini?')) return
    await supabase.from('fact_daily_performance').delete().eq('record_id', id)
    fetchRecentData()
  }

  const set = (key: keyof PerformanceForm, val: string) => {
    setForm(f => {
      const updated = { ...f, [key]: val }
      if (key === 'client_id' || key === 'platform') updated.campaign_id = ''
      return updated
    })
  }

  // Count rows by platform for summary
  const platformSummary = csvRows.reduce<Record<string, number>>((acc, row) => {
    const p = row._resolvedPlatform || 'Unknown'
    acc[p] = (acc[p] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {successMsg && <div onClick={() => setSuccessMsg('')} style={{ background: '#EAF3DE', color: '#27500A', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' }}>✓ {successMsg}</div>}
      {errorMsg && <div onClick={() => setErrorMsg('')} style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' }}>⚠ {errorMsg}</div>}

      {/* Add Client Modal */}
      {showAddClient && (
        <Card title="Tambah client baru">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><Label required>Nama client</Label><Input value={newClient.name} onChange={v => setNewClient(c => ({ ...c, name: v }))} placeholder="e.g. PT Maju Bersama" /></div>
            <div><Label>Jenis bisnis</Label><Input value={newClient.business_type} onChange={v => setNewClient(c => ({ ...c, business_type: v }))} placeholder="e.g. E-commerce, F&B" /></div>
            <div><Label>Email kontak</Label><Input value={newClient.contact_email} onChange={v => setNewClient(c => ({ ...c, contact_email: v }))} type="email" placeholder="admin@client.com" /></div>
            <div><Label>No. telepon</Label><Input value={newClient.contact_phone} onChange={v => setNewClient(c => ({ ...c, contact_phone: v }))} placeholder="08123456789" /></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAddClient} disabled={savingClient} style={{ padding: '8px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              {savingClient ? 'Menyimpan...' : 'Simpan Client'}
            </button>
            <button onClick={() => setShowAddClient(false)} style={{ padding: '8px 16px', background: '#fff', color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Batal</button>
          </div>
        </Card>
      )}

      {/* Manual Input */}
      <Card title="Input data performa harian">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <Label required>1. Client</Label>
              <button onClick={() => setShowAddClient(true)} style={{ fontSize: '10px', padding: '2px 8px', background: '#E6F1FB', color: '#185FA5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>+ Tambah Client</button>
            </div>
            <SelectField value={form.client_id} onChange={v => set('client_id', v)} options={clients.map(c => ({ value: c.client_id, label: c.client_name }))} placeholder="— Pilih Client —" />
          </div>
          <div>
            <Label required>2. Platform</Label>
            <div style={{ marginTop: '4px' }}>
              <PlatformToggle value={form.platform} onChange={v => set('platform', v)} />
            </div>
          </div>
          <div>
            <Label required>3. Campaign</Label>
            <SelectField value={form.campaign_id} onChange={v => set('campaign_id', v)}
              options={campaigns.map(c => ({ value: c.campaign_id, label: c.campaign_name }))}
              placeholder={!form.client_id || !form.platform ? '— Pilih client & platform dulu —' : campaigns.length === 0 ? '— Tidak ada campaign aktif —' : '— Pilih Campaign —'} />
          </div>
          <div><Label required>Tanggal laporan</Label><Input value={form.report_date} onChange={v => set('report_date', v)} type="date" /></div>
          <div><Label required>Spend (Rp)</Label><Input value={form.spend} onChange={v => set('spend', v)} type="number" placeholder="e.g. 500000" /></div>
          <div><Label>Impressions</Label><Input value={form.impressions} onChange={v => set('impressions', v)} type="number" placeholder="e.g. 50000" /></div>
          <div><Label>Reach</Label><Input value={form.reach} onChange={v => set('reach', v)} type="number" placeholder="e.g. 40000" /></div>
          <div><Label>Clicks</Label><Input value={form.clicks} onChange={v => set('clicks', v)} type="number" placeholder="e.g. 800" /></div>
          <div><Label>Conversions (7d click)</Label><Input value={form.conversions_7d_click} onChange={v => set('conversions_7d_click', v)} type="number" placeholder="e.g. 25" /></div>
          <div><Label>Revenue / Conv. Value (Rp)</Label><Input value={form.conversion_value} onChange={v => set('conversion_value', v)} type="number" placeholder="e.g. 2500000" /></div>
          <div><Label>Purchases</Label><Input value={form.purchases} onChange={v => set('purchases', v)} type="number" placeholder="e.g. 20" /></div>
        </div>
        <button onClick={handleManualSubmit} disabled={loadingSubmit}
          style={{ padding: '10px 24px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: loadingSubmit ? 0.7 : 1 }}>
          {loadingSubmit ? 'Menyimpan...' : 'Simpan Data'}
        </button>
      </Card>

      {/* CSV Import */}
      <Card title="Import CSV dari Ads Manager">
        <div style={{ background: '#f5f5f3', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>Format kolom CSV:</div>
          <code style={{ fontSize: '11px', color: '#185FA5', lineHeight: '1.8' }}>
            campaign_name, platform, report_date, impressions, reach, clicks, spend, conversions_7d_click, conversion_value, purchases
          </code>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '6px' }}>
            Kolom <strong>platform</strong> opsional — jika ada, akan digunakan langsung. Jika tidak ada, sistem akan deteksi dari nama campaign (GAD_ → Google, TT_ → TikTok, FB_ → Meta) atau gunakan platform default di bawah.
          </div>
        </div>

        {/* Client + Default Platform selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <Label required>Client untuk import ini</Label>
            <select value={csvClientId} onChange={e => setCsvClientId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', outline: 'none' }}>
              <option value="">— Pilih Client —</option>
              {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Platform default (untuk row tanpa platform)</Label>
            <div style={{ marginTop: '4px' }}>
              <PlatformToggle value={csvDefaultPlatform} onChange={handleDefaultPlatformChange} />
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '5px' }}>
              Digunakan jika kolom platform kosong dan nama campaign tidak bisa dideteksi
            </div>
          </div>
        </div>

        {/* Upload area */}
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: csvFile ? '1.5px solid #185FA5' : '1.5px dashed rgba(0,0,0,0.15)',
          borderRadius: '10px', padding: '32px 20px', cursor: 'pointer',
          background: csvFile ? '#f0f6ff' : '#fafaf9', marginBottom: '16px', transition: 'all 0.15s',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>{csvFile ? '📄' : '☁️'}</div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: csvFile ? '#185FA5' : '#555', marginBottom: '4px' }}>
            {csvFile ? csvFile.name : 'Klik untuk upload file CSV'}
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            {csvFile ? `${csvRows.length} baris data terdeteksi` : 'Format: .csv — dari Meta Ads Manager, Google Ads, atau TikTok Ads'}
          </div>
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
        </label>

        {analyzingCsv && (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#888' }}>Menganalisis file...</div>
        )}

        {!analyzingCsv && csvRows.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {/* Platform summary */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ background: '#EAF3DE', color: '#27500A', fontSize: '11px', padding: '6px 12px', borderRadius: '6px', fontWeight: 500 }}>
                ✓ {csvPreview.matched} baris siap diimport
              </div>
              {Object.entries(platformSummary).map(([p, count]) => {
                const s = PLATFORM_STYLE[p] || { bg: '#F1EFE8', color: '#444441' }
                return (
                  <div key={p} style={{ background: s.bg, color: s.color, fontSize: '11px', padding: '6px 12px', borderRadius: '6px', fontWeight: 500 }}>
                    {p}: {count} baris
                  </div>
                )
              })}
              {csvPreview.newCampaigns.length > 0 && (
                <div style={{ background: '#E6F1FB', color: '#185FA5', fontSize: '11px', padding: '6px 12px', borderRadius: '6px' }}>
                  ℹ {csvPreview.newCampaigns.length} campaign baru akan dibuat
                </div>
              )}
            </div>

            {csvPreview.newCampaigns.length > 0 && (
              <div style={{ background: '#E6F1FB', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '11px', color: '#185FA5' }}>
                {csvPreview.newCampaigns.slice(0, 5).map((name, i) => (
                  <div key={i}>• Campaign baru akan dibuat: <strong>"{name}"</strong></div>
                ))}
              </div>
            )}

            {/* Preview table with editable platform per row */}
            <div style={{ overflowX: 'auto', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#888', padding: '8px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Preview 5 baris pertama dari {csvRows.length} total — klik platform untuk ubah</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>campaign_name</th>
                    <th style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>platform (editable)</th>
                    <th style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>report_date</th>
                    <th style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>spend</th>
                    <th style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>impressions</th>
                    <th style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                      <td style={{ padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {row.campaign_name || '—'}
                      </td>
                      <td style={{ padding: '4px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        {/* Inline platform selector per row */}
                        <select
                          value={row._resolvedPlatform}
                          onChange={e => handleRowPlatformOverride(i, e.target.value)}
                          style={{
                            fontSize: '10px', padding: '2px 6px', borderRadius: '99px', fontWeight: 600,
                            background: PLATFORM_STYLE[row._resolvedPlatform]?.bg || '#F1EFE8',
                            color: PLATFORM_STYLE[row._resolvedPlatform]?.color || '#444441',
                            border: `1px solid ${PLATFORM_STYLE[row._resolvedPlatform]?.bg || '#F1EFE8'}`,
                            cursor: 'pointer', outline: 'none',
                          }}
                        >
                          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>{row.report_date || row.date || '—'}</td>
                      <td style={{ padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>{row.spend ? `Rp ${Number(row.spend).toLocaleString('id')}` : '—'}</td>
                      <td style={{ padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.impressions || '—'}</td>
                      <td style={{ padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.clicks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 5 && (
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#aaa', borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                  + {csvRows.length - 5} baris lainnya tidak ditampilkan. Platform untuk semua baris mengikuti deteksi otomatis atau default yang dipilih.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleCsvImport} disabled={loadingCsv || csvRows.length === 0}
            style={{ padding: '10px 24px', background: csvRows.length > 0 ? '#3B6D11' : '#ccc', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: csvRows.length > 0 ? 'pointer' : 'not-allowed', opacity: loadingCsv ? 0.7 : 1 }}>
            {loadingCsv ? 'Mengimport...' : csvRows.length > 0 ? `Import ${csvRows.length} baris` : 'Import CSV'}
          </button>
          {csvFile && (
            <button onClick={() => { setCsvFile(null); setCsvRows([]); setCsvPreview({ matched: 0, newCampaigns: [], rows: [] }) }}
              style={{ padding: '10px 16px', background: '#fff', color: '#888', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>
      </Card>

      {/* Recent Data */}
      <Card title="Data performa terbaru (30 record terakhir)">
        {loadingRecent ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '12px' }}>Memuat...</div>
        ) : recentData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '12px' }}>Belum ada data performa.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>{['Tanggal', 'Campaign', 'Platform', 'Spend', 'Impressions', 'Clicks', 'Conv.', 'Revenue', 'Hapus'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {recentData.map((r, i) => (
                  <tr key={r.record_id} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>{r.report_date}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(Array.isArray(r.dim_campaigns) ? r.dim_campaigns[0]?.campaign_name : r.dim_campaigns?.campaign_name) || '—'}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      {platformBadge((Array.isArray(r.dim_platforms) ? r.dim_platforms[0]?.platform_name : r.dim_platforms?.platform_name) || '—')}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>Rp {Number(r.spend).toLocaleString('id')}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{Number(r.impressions).toLocaleString('id')}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{Number(r.clicks).toLocaleString('id')}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{r.conversions_7d_click}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>Rp {Number(r.conversion_value).toLocaleString('id')}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <button onClick={() => handleDeleteRecord(r.record_id)}
                        style={{ fontSize: '10px', padding: '3px 8px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
