import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Client {
  client_id: string
  client_name: string
  business_type: string | null
  contact_email: string | null
}

interface Campaign {
  campaign_id: string
  campaign_name: string
  platform_id: number
  dim_platforms: { platform_name: string } | { platform_name: string }[]
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

const emptyForm: PerformanceForm = {
  client_id: '', platform: '', campaign_id: '', report_date: '',
  impressions: '', reach: '', clicks: '', spend: '',
  conversions_7d_click: '', conversion_value: '', purchases: '',
}

const PLATFORMS = ['Meta', 'Google', 'TikTok']

const PLATFORM_COLORS: Record<string, { active: string; bg: string }> = {
  Meta: { active: '#185FA5', bg: '#E6F1FB' },
  Google: { active: '#A32D2D', bg: '#FCEBEB' },
  TikTok: { active: '#444441', bg: '#F1EFE8' },
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
      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', color: '#1a1a1a', outline: 'none' }} />
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
  const map: Record<string, { bg: string; color: string }> = {
    Meta: { bg: '#E6F1FB', color: '#185FA5' },
    Google: { bg: '#FCEBEB', color: '#A32D2D' },
    TikTok: { bg: '#F1EFE8', color: '#444441' },
  }
  const s = map[p] || { bg: '#F1EFE8', color: '#444441' }
  return <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>{p}</span>
}

// Deteksi platform dari nama file atau isi CSV
function detectPlatformFromFile(filename: string, headers: string[]): string {
  const name = filename.toLowerCase()
  if (name.includes('meta') || name.includes('facebook') || name.includes('fb')) return 'Meta'
  if (name.includes('google') || name.includes('gads')) return 'Google'
  if (name.includes('tiktok') || name.includes('tik_tok')) return 'TikTok'
  // Cek dari header
  const h = headers.join(' ').toLowerCase()
  if (h.includes('facebook') || h.includes('meta')) return 'Meta'
  if (h.includes('google')) return 'Google'
  if (h.includes('tiktok')) return 'TikTok'
  return ''
}

export default function DataInputTab() {
  const { profile } = useAuth()
  const isFounderOrAdmin = profile?.role === 'founder' || profile?.role === 'admin'

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

  // CSV state — simplified
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvClientId, setCsvClientId] = useState('')
  const [csvPlatform, setCsvPlatform] = useState('')
  const [csvCampaignId, setCsvCampaignId] = useState('')
  const [csvCampaigns, setCsvCampaigns] = useState<Campaign[]>([])
  const [loadingCsv, setLoadingCsv] = useState(false)
  const [csvDragOver, setCsvDragOver] = useState(false)

  useEffect(() => {
    fetchClients()
    fetchRecentData()
    // Kalau client, auto-set csvClientId ke client mereka
    if (profile?.role === 'client' && profile?.client_id) {
      setCsvClientId(profile.client_id)
    }
  }, [profile])

  useEffect(() => {
    if (form.client_id && form.platform) fetchCampaigns(form.client_id, form.platform)
    else setCampaigns([])
  }, [form.client_id, form.platform])

  useEffect(() => {
    if (csvClientId && csvPlatform) fetchCsvCampaigns(csvClientId, csvPlatform)
    else setCsvCampaigns([])
  }, [csvClientId, csvPlatform])

  // Auto-set client untuk non-founder
  useEffect(() => {
    if (!isFounderOrAdmin && profile?.client_id) {
      setForm(f => ({ ...f, client_id: profile.client_id! }))
    }
  }, [profile])

  const fetchClients = async () => {
    const { data } = await supabase.from('dim_clients').select('*').eq('is_active', true).order('client_name')
    if (data) setClients(data)
  }

  const fetchCampaigns = async (clientId: string, platform: string) => {
    const { data: platformData } = await supabase.from('dim_platforms').select('platform_id').eq('platform_name', platform).single()
    if (!platformData) return
    const { data } = await supabase.from('dim_campaigns')
      .select('campaign_id, campaign_name, platform_id, dim_platforms(platform_name)')
      .eq('client_id', clientId).eq('platform_id', platformData.platform_id).eq('status', 'Active')
    if (data) setCampaigns(data as Campaign[])
  }

  const fetchCsvCampaigns = async (clientId: string, platform: string) => {
    const { data: platformData } = await supabase.from('dim_platforms').select('platform_id').eq('platform_name', platform).single()
    if (!platformData) return
    const { data } = await supabase.from('dim_campaigns')
      .select('campaign_id, campaign_name, platform_id, dim_platforms(platform_name)')
      .eq('client_id', clientId).eq('platform_id', platformData.platform_id).eq('status', 'Active')
    if (data) setCsvCampaigns(data as Campaign[])
  }

  const fetchRecentData = async () => {
    setLoadingRecent(true)
    let query = supabase.from('fact_daily_performance')
      .select('record_id, report_date, spend, impressions, clicks, conversions_7d_click, conversion_value, dim_campaigns(campaign_name), dim_platforms(platform_name)')
      .order('report_date', { ascending: false }).limit(30)
    // Filter by client kalau bukan founder/admin
    if (profile?.role === 'client' && profile?.client_id) {
      query = query.eq('client_id', profile.client_id)
    }
    const { data } = await query
    if (data) setRecentData(data as RecentRecord[])
    setLoadingRecent(false)
  }

  const parseCSV = (text: string, filename: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    }).filter(row => Object.values(row).some(v => v !== ''))

    setCsvHeaders(headers)
    setCsvData(rows)

    // Auto-detect platform
    const detected = detectPlatformFromFile(filename, headers)
    if (detected) setCsvPlatform(detected)
  }

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) { setErrorMsg('Hanya file .csv yang didukung'); return }
    setCsvFile(file)
    setCsvData([])
    setCsvHeaders([])
    setErrorMsg('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      parseCSV(ev.target?.result as string, file.name)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setCsvDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleCsvImport = async () => {
    const clientId = csvClientId || profile?.client_id || ''
    if (!clientId) { setErrorMsg('Client tidak terdeteksi'); return }
    if (!csvPlatform) { setErrorMsg('Platform belum dipilih'); return }
    if (!csvCampaignId) { setErrorMsg('Campaign belum dipilih'); return }
    if (csvData.length === 0) { setErrorMsg('Tidak ada data CSV'); return }

    setLoadingCsv(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { data: platformData } = await supabase.from('dim_platforms').select('platform_id').eq('platform_name', csvPlatform).single()

    const rows = csvData.map(row => ({
      campaign_id: csvCampaignId,
      platform_id: platformData?.platform_id,
      client_id: clientId,
      report_date: row.report_date || row.date || row.Date || '',
      impressions: Number(row.impressions) || 0,
      reach: Number(row.reach) || 0,
      clicks: Number(row.clicks) || Number(row.link_clicks) || 0,
      spend: Number(row.spend) || Number(row.amount_spent) || 0,
      conversions_7d_click: Number(row.conversions_7d_click) || Number(row.conversions) || 0,
      conversion_value: Number(row.conversion_value) || Number(row.revenue) || 0,
      purchases: Number(row.purchases) || 0,
    })).filter(r => r.report_date !== '')

    const { error } = await supabase.from('fact_daily_performance').insert(rows)
    if (error) {
      setErrorMsg('Gagal import: ' + error.message)
    } else {
      setSuccessMsg(`${rows.length} baris berhasil diimport!`)
      setCsvFile(null); setCsvData([]); setCsvHeaders([])
      setCsvCampaignId('')
      if (isFounderOrAdmin) { setCsvClientId(''); setCsvPlatform('') }
      fetchRecentData()
    }
    setLoadingCsv(false)
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
      setForm(f => ({ ...f, report_date: '', impressions: '', reach: '', clicks: '', spend: '', conversions_7d_click: '', conversion_value: '', purchases: '' }))
      fetchRecentData()
    }
    setLoadingSubmit(false)
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

  // Nama client untuk display
  const clientName = clients.find(c => c.client_id === (csvClientId || profile?.client_id))?.client_name

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {successMsg && <div style={{ background: '#EAF3DE', color: '#27500A', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>✓ {successMsg}</div>}
      {errorMsg && <div style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>⚠ {errorMsg}</div>}

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
            <button onClick={handleAddClient} disabled={savingClient}
              style={{ padding: '8px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              {savingClient ? 'Menyimpan...' : 'Simpan Client'}
            </button>
            <button onClick={() => setShowAddClient(false)}
              style={{ padding: '8px 16px', background: '#fff', color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </Card>
      )}

      {/* CSV Import — simplified */}
      <Card title="Import CSV dari Ads Manager">

        {/* Step info */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['1. Upload CSV', '2. Pilih Platform', '3. Pilih Campaign', '4. Import'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: 500,
                background: i === 0 && csvFile ? '#EAF3DE' : i === 1 && csvPlatform ? '#EAF3DE' : i === 2 && csvCampaignId ? '#EAF3DE' : '#f5f5f3',
                color: i === 0 && csvFile ? '#27500A' : i === 1 && csvPlatform ? '#27500A' : i === 2 && csvCampaignId ? '#27500A' : '#888',
              }}>{s}</span>
              {i < 3 && <span style={{ fontSize: '10px', color: '#ccc' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setCsvDragOver(true) }}
          onDragLeave={() => setCsvDragOver(false)}
          onClick={() => document.getElementById('csv-file-input')?.click()}
          style={{
            border: `1.5px dashed ${csvDragOver ? '#185FA5' : csvFile ? '#3B6D11' : 'rgba(0,0,0,0.15)'}`,
            borderRadius: '10px',
            padding: '28px',
            textAlign: 'center',
            cursor: 'pointer',
            background: csvDragOver ? '#E6F1FB' : csvFile ? '#EAF3DE' : '#fafaf9',
            marginBottom: '16px',
            transition: 'all 0.15s',
          }}
        >
          <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
          {csvFile ? (
            <div>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>✓</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#27500A' }}>{csvFile.name}</div>
              <div style={{ fontSize: '11px', color: '#3B6D11', marginTop: '4px' }}>{csvData.length} baris data terdeteksi</div>
              <div style={{ fontSize: '10px', color: '#888', marginTop: '6px' }}>Klik untuk ganti file</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>Drop file CSV di sini</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>atau klik untuk pilih file</div>
              <div style={{ fontSize: '10px', color: '#bbb', marginTop: '8px' }}>
                Kolom: report_date, impressions, clicks, spend, conversions_7d_click, conversion_value
              </div>
            </div>
          )}
        </div>

        {csvData.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isFounderOrAdmin ? 'repeat(3, minmax(0,1fr))' : '1fr 1fr', gap: '14px', marginBottom: '16px' }}>

            {/* Client — hanya untuk founder/admin */}
            {isFounderOrAdmin && (
              <div>
                <Label required>Client</Label>
                <SelectField value={csvClientId} onChange={v => { setCsvClientId(v); setCsvCampaignId('') }}
                  options={clients.map(c => ({ value: c.client_id, label: c.client_name }))}
                  placeholder="— Pilih Client —" />
              </div>
            )}

            {/* Client info untuk non-founder */}
            {!isFounderOrAdmin && clientName && (
              <div>
                <Label>Client</Label>
                <div style={{ padding: '8px 10px', fontSize: '12px', background: '#f5f5f3', borderRadius: '6px', color: '#555', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  {clientName}
                </div>
              </div>
            )}

            {/* Platform — auto-detect atau pilih manual */}
            <div>
              <Label required>Platform {csvPlatform && !['Meta','Google','TikTok'].includes(csvPlatform) ? '' : csvPlatform ? '(terdeteksi otomatis)' : ''}</Label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {PLATFORMS.map(p => {
                  const isActive = csvPlatform === p
                  return (
                    <button key={p} onClick={() => { setCsvPlatform(p); setCsvCampaignId('') }}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '11px', fontWeight: isActive ? 500 : 400,
                        border: isActive ? `1.5px solid ${PLATFORM_COLORS[p].active}` : '0.5px solid rgba(0,0,0,0.12)',
                        background: isActive ? PLATFORM_COLORS[p].bg : '#fff',
                        color: isActive ? PLATFORM_COLORS[p].active : '#555',
                      }}>{p}</button>
                  )
                })}
              </div>
            </div>

            {/* Campaign */}
            <div>
              <Label required>Campaign</Label>
              <SelectField value={csvCampaignId} onChange={setCsvCampaignId}
                options={csvCampaigns.map(c => ({ value: c.campaign_id, label: c.campaign_name }))}
                placeholder={!csvClientId && isFounderOrAdmin ? '— Pilih client dulu —' : !csvPlatform ? '— Pilih platform dulu —' : csvCampaigns.length === 0 ? '— Tidak ada campaign aktif —' : '— Pilih Campaign —'} />
            </div>
          </div>
        )}

        {/* Preview */}
        {csvData.length > 0 && (
          <div style={{ marginBottom: '14px', overflowX: 'auto', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#888', padding: '8px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              Preview {Math.min(5, csvData.length)} dari {csvData.length} baris
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>{csvHeaders.map(h => <th key={h} style={{ padding: '6px 10px', background: '#f5f5f3', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, i) => (
                  <tr key={i}>{csvHeaders.map((h, j) => <td key={j} style={{ padding: '5px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>{row[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={handleCsvImport}
          disabled={loadingCsv || csvData.length === 0 || !csvPlatform || !csvCampaignId || (!csvClientId && isFounderOrAdmin)}
          style={{
            padding: '10px 24px',
            background: (csvData.length > 0 && csvPlatform && csvCampaignId) ? '#3B6D11' : '#ccc',
            color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
            cursor: (csvData.length > 0 && csvPlatform && csvCampaignId) ? 'pointer' : 'not-allowed',
            opacity: loadingCsv ? 0.7 : 1,
          }}>
          {loadingCsv ? 'Mengimport...' : `Import ${csvData.length} baris`}
        </button>
      </Card>

      {/* Manual Input */}
      <Card title="Input data performa manual">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <Label required>1. Client</Label>
              {isFounderOrAdmin && (
                <button onClick={() => setShowAddClient(true)}
                  style={{ fontSize: '10px', padding: '2px 8px', background: '#E6F1FB', color: '#185FA5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
                  + Tambah
                </button>
              )}
            </div>
            {isFounderOrAdmin ? (
              <SelectField value={form.client_id} onChange={v => set('client_id', v)}
                options={clients.map(c => ({ value: c.client_id, label: c.client_name }))} placeholder="— Pilih Client —" />
            ) : (
              <div style={{ padding: '8px 10px', fontSize: '12px', background: '#f5f5f3', borderRadius: '6px', color: '#555', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                {clients.find(c => c.client_id === form.client_id)?.client_name || '—'}
              </div>
            )}
          </div>
          <div>
            <Label required>2. Platform</Label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {PLATFORMS.map(p => {
                const isActive = form.platform === p
                return (
                  <button key={p} onClick={() => set('platform', p)}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                      fontWeight: isActive ? 500 : 400,
                      border: isActive ? `1.5px solid ${PLATFORM_COLORS[p].active}` : '0.5px solid rgba(0,0,0,0.12)',
                      background: isActive ? PLATFORM_COLORS[p].bg : '#fff',
                      color: isActive ? PLATFORM_COLORS[p].active : '#555',
                    }}>{p}</button>
                )
              })}
            </div>
          </div>
          <div>
            <Label required>3. Campaign</Label>
            <SelectField value={form.campaign_id} onChange={v => set('campaign_id', v)}
              options={campaigns.map(c => ({ value: c.campaign_id, label: c.campaign_name }))}
              placeholder={!form.client_id || !form.platform ? '— Pilih client & platform dulu —' : campaigns.length === 0 ? '— Tidak ada campaign aktif —' : '— Pilih Campaign —'} />
          </div>
          <div><Label required>Tanggal laporan</Label><Input value={form.report_date} onChange={v => set('report_date', v)} type="date" /></div>
          <div><Label required>Spend (Rp)</Label><Input value={form.spend} onChange={v => set('spend', v)} type="number" placeholder="500000" /></div>
          <div><Label>Impressions</Label><Input value={form.impressions} onChange={v => set('impressions', v)} type="number" placeholder="50000" /></div>
          <div><Label>Reach</Label><Input value={form.reach} onChange={v => set('reach', v)} type="number" placeholder="40000" /></div>
          <div><Label>Clicks</Label><Input value={form.clicks} onChange={v => set('clicks', v)} type="number" placeholder="800" /></div>
          <div><Label>Conversions (7d click)</Label><Input value={form.conversions_7d_click} onChange={v => set('conversions_7d_click', v)} type="number" placeholder="25" /></div>
          <div><Label>Revenue / Conv. Value (Rp)</Label><Input value={form.conversion_value} onChange={v => set('conversion_value', v)} type="number" placeholder="2500000" /></div>
          <div><Label>Purchases</Label><Input value={form.purchases} onChange={v => set('purchases', v)} type="number" placeholder="20" /></div>
        </div>
        <button onClick={handleManualSubmit} disabled={loadingSubmit}
          style={{ padding: '10px 24px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: loadingSubmit ? 0.7 : 1 }}>
          {loadingSubmit ? 'Menyimpan...' : 'Simpan Data'}
        </button>
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
