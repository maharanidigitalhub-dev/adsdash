import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PLATFORMS = ['Meta', 'Google', 'TikTok']

const OBJECTIVES: Record<string, string[]> = {
  Meta: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'App Promotion', 'Sales'],
  Google: ['Sales', 'Leads', 'Website Traffic', 'Brand Awareness', 'App Promotion', 'Local Store Visits'],
  TikTok: ['Reach', 'Traffic', 'Video Views', 'Community Interaction', 'Lead Generation', 'App Promotion', 'Website Conversions', 'Product Sales'],
}

const PLACEMENTS: Record<string, string[]> = {
  Meta: ['Facebook Feed', 'Instagram Feed', 'Instagram Reels', 'Facebook Reels', 'Stories', 'Marketplace', 'Audience Network'],
  Google: ['Search', 'Display', 'YouTube', 'Gmail', 'Discovery', 'Performance Max'],
  TikTok: ['TikTok For You', 'TopView', 'Brand Takeover', 'Branded Hashtag', 'Spark Ads'],
}

const METRICS_BY_PLATFORM: Record<string, { label: string; key: string; type: string; placeholder: string }[]> = {
  Meta: [
    { label: 'Target ROAS', key: 'target_roas', type: 'number', placeholder: 'e.g. 3.5' },
    { label: 'Target CPA (Rp)', key: 'target_cpa', type: 'number', placeholder: 'e.g. 25000' },
    { label: 'Bid Strategy', key: 'bid_strategy', type: 'select', placeholder: 'Lowest Cost|Cost Cap|Bid Cap|Target Cost' },
    { label: 'Attribution Window', key: 'attribution', type: 'select', placeholder: '1-day click|7-day click|1-day view|7-day click + 1-day view' },
    { label: 'Pixel ID', key: 'pixel_id', type: 'text', placeholder: 'Meta Pixel ID' },
  ],
  Google: [
    { label: 'Target ROAS (%)', key: 'target_roas', type: 'number', placeholder: 'e.g. 350 (= 3.5x)' },
    { label: 'Target CPA (Rp)', key: 'target_cpa', type: 'number', placeholder: 'e.g. 25000' },
    { label: 'Bid Strategy', key: 'bid_strategy', type: 'select', placeholder: 'Maximize Conversions|Target CPA|Target ROAS|Maximize Clicks|Manual CPC' },
    { label: 'Ad Rotation', key: 'ad_rotation', type: 'select', placeholder: 'Optimize|Do not optimize' },
    { label: 'Conversion Action', key: 'conversion_action', type: 'text', placeholder: 'e.g. Purchase, Lead' },
  ],
  TikTok: [
    { label: 'Optimization Goal', key: 'optimization_goal', type: 'select', placeholder: 'Conversion|Click|Reach|Video View' },
    { label: 'Bid Type', key: 'bid_type', type: 'select', placeholder: 'Lowest Cost|Cost Cap|Bid Cap' },
    { label: 'Target CPA (Rp)', key: 'target_cpa', type: 'number', placeholder: 'e.g. 25000' },
    { label: 'Pixel ID', key: 'pixel_id', type: 'text', placeholder: 'TikTok Pixel ID' },
    { label: 'Attribution Window', key: 'attribution', type: 'select', placeholder: '1-day click|7-day click' },
  ],
}

interface AdCreative {
  id: string
  name: string
  headline: string
  primary_text: string
  cta: string
  destination_url: string
  media_files: File[]
  media_previews: string[]
}

interface FormData {
  client_id: string
  platform: string
  objective: string
  campaign_name: string
  budget_type: string
  daily_budget: string
  lifetime_budget: string
  start_date: string
  end_date: string
  adset_name: string
  age_min: string
  age_max: string
  gender: string
  locations: string
  placements: string[]
  metrics: Record<string, string>
  ads: AdCreative[]
}

const CTA_OPTIONS = ['Shop Now', 'Learn More', 'Sign Up', 'Book Now', 'Contact Us', 'Download', 'Get Quote', 'Subscribe', 'Watch More']

const emptyAd = (): AdCreative => ({
  id: Math.random().toString(36).slice(2),
  name: '', headline: '', primary_text: '', cta: 'Shop Now',
  destination_url: '', media_files: [], media_previews: [],
})

const initialForm: FormData = {
  client_id: '', platform: '', objective: '', campaign_name: '',
  budget_type: 'daily', daily_budget: '', lifetime_budget: '',
  start_date: '', end_date: '', adset_name: '', age_min: '18',
  age_max: '65', gender: 'All', locations: 'Indonesia',
  placements: [], metrics: {}, ads: [emptyAd()],
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Client & Platform', 'Campaign', 'Ad Set', 'Creatives', 'Review']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      {labels.map((label, i) => {
        const step = i + 1
        const active = step === current
        const done = step < current
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: done ? '#3B6D11' : active ? '#185FA5' : '#e0e0e0',
                color: done || active ? '#fff' : '#888',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 500, flexShrink: 0,
              }}>
                {done ? '✓' : step}
              </div>
              <span style={{ fontSize: '10px', color: active ? '#185FA5' : done ? '#3B6D11' : '#888', whiteSpace: 'nowrap', fontWeight: active ? 500 : 400 }}>{label}</span>
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: '1px', background: done ? '#3B6D11' : '#e0e0e0', margin: '0 6px', marginBottom: '18px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <label style={{ fontSize: '11px', fontWeight: 500, color: '#555', marginBottom: '4px', display: 'block' }}>
      {children}{required && <span style={{ color: '#E24B4A', marginLeft: '2px' }}>*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', color: '#1a1a1a', outline: 'none' }} />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', color: value ? '#1a1a1a' : '#888', outline: 'none' }}>
      <option value="">— Pilih —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
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

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: '14px' }}>
      {children}
    </div>
  )
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
      <span style={{ fontSize: '11px', color: '#888', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: highlight ? 500 : 400, color: highlight ? '#185FA5' : '#1a1a1a' }}>{value || '—'}</span>
    </div>
  )
}

export default function AdsSettingTab() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<{ client_id: string; client_name: string; business_type: string | null }[]>([])
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    supabase.from('dim_clients').select('client_id, client_name, business_type')
      .eq('is_active', true).order('client_name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  const set = (key: keyof FormData, value: unknown) => setForm(f => ({ ...f, [key]: value }))
  const setMetric = (key: string, value: string) => setForm(f => ({ ...f, metrics: { ...f.metrics, [key]: value } }))
  const setAd = (id: string, key: keyof AdCreative, value: unknown) =>
    setForm(f => ({ ...f, ads: f.ads.map(a => a.id === id ? { ...a, [key]: value } : a) }))
  const addAd = () => setForm(f => ({ ...f, ads: [...f.ads, emptyAd()] }))
  const removeAd = (id: string) => setForm(f => ({ ...f, ads: f.ads.filter(a => a.id !== id) }))
  const togglePlacement = (p: string) => {
    const current = form.placements
    set('placements', current.includes(p) ? current.filter(x => x !== p) : [...current, p])
  }
  const handleMedia = (adId: string, files: FileList | null) => {
    if (!files) return
    const fileArr = Array.from(files)
    const previews = fileArr.map(f => URL.createObjectURL(f))
    setAd(adId, 'media_files', fileArr)
    setAd(adId, 'media_previews', previews)
  }

  const platformColor = (p: string) => p === 'Meta' ? '#185FA5' : p === 'Google' ? '#A32D2D' : '#444441'
  const platformBg = (p: string) => p === 'Meta' ? '#E6F1FB' : p === 'Google' ? '#FCEBEB' : '#F1EFE8'

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    if (step === 1) {
      if (!form.client_id) newErrors.client_id = 'Pilih client terlebih dahulu'
      if (!form.platform) newErrors.platform = 'Pilih platform terlebih dahulu'
      if (!form.objective) newErrors.objective = 'Pilih objective terlebih dahulu'
    }
    if (step === 2) {
      if (!form.campaign_name.trim()) newErrors.campaign_name = 'Nama campaign wajib diisi'
      if (form.budget_type === 'daily' && !form.daily_budget) newErrors.daily_budget = 'Daily budget wajib diisi'
      if (form.budget_type === 'lifetime' && !form.lifetime_budget) newErrors.lifetime_budget = 'Lifetime budget wajib diisi'
    }
    if (step === 3) {
      if (!form.adset_name.trim()) newErrors.adset_name = 'Nama ad set wajib diisi'
      if (form.placements.length === 0) newErrors.placements = 'Pilih minimal 1 placement'
    }
    if (step === 4) {
      form.ads.forEach((ad, i) => {
        if (!ad.name.trim()) newErrors[`ad_name_${i}`] = `Nama ad #${i + 1} wajib diisi`
        if (!ad.headline.trim()) newErrors[`ad_headline_${i}`] = `Headline ad #${i + 1} wajib diisi`
      })
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setStep(s => Math.min(5, s + 1))
  }

    const handleSubmit = async () => {
      setLoading(true)
      alert('Submit dimulai - platform: ' + form.platform + ', client: ' + form.client_id) // ← tambah di sini
      try {
      const { data: platformData } = await supabase.from('dim_platforms').select('platform_id').eq('platform_name', form.platform).single()
      if (!platformData) { alert('Platform tidak ditemukan'); return }
      const platformId = platformData.platform_id

      const { data: campaign, error: campError } = await supabase.from('dim_campaigns').insert({
        client_id: form.client_id,
        platform_id: platformId,
        campaign_name: form.campaign_name,
        objective: form.objective,
        budget_type: form.budget_type,
        daily_budget: form.budget_type === 'daily' ? Number(form.daily_budget) : null,
        allocated_budget: form.budget_type === 'lifetime' ? Number(form.lifetime_budget) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        target_roas: form.metrics.target_roas ? Number(form.metrics.target_roas) : null,
        target_cpa: form.metrics.target_cpa ? Number(form.metrics.target_cpa) : null,
        bid_strategy: form.metrics.bid_strategy || null,
        attribution_window: form.metrics.attribution || null,
        pixel_id: form.metrics.pixel_id || null,
        status: 'Active',
      }).select().single()

      if (campError || !campaign) { alert('Gagal simpan campaign: ' + campError?.message); return }

      const { data: adset, error: adsetError } = await supabase.from('dim_adsets').insert({
        campaign_id: campaign.campaign_id,
        client_id: form.client_id,
        adset_name: form.adset_name,
        targeting_age_min: Number(form.age_min),
        targeting_age_max: Number(form.age_max),
        targeting_gender: form.gender,
        targeting_locations: form.locations,
        placements: form.placements.join(', '),
        status: 'Active',
      }).select().single()

      if (adsetError || !adset) { alert('Gagal simpan ad set: ' + adsetError?.message); return }

      for (const ad of form.ads) {
        await supabase.from('dim_ads').insert({
          adset_id: adset.adset_id,
          campaign_id: campaign.campaign_id,
          platform_id: platformId,
          client_id: form.client_id,
          ad_name: ad.name,
          headline: ad.headline,
          primary_text: ad.primary_text,
          cta_type: ad.cta,
          destination_url: ad.destination_url,
          status: 'Active',
        })
      }
      setSubmitted(true)
    } catch (err) {
      alert('Terjadi kesalahan: ' + err)
    } finally {
      setLoading(false)
    }
  }

  const selectedClient = clients.find(c => c.client_id === form.client_id)

  if (submitted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
        <div style={{ fontSize: '18px', fontWeight: 500, color: '#1a1a1a', marginBottom: '8px' }}>Campaign berhasil disimpan!</div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>
          Campaign <b>{form.campaign_name}</b> untuk client <b>{selectedClient?.client_name}</b> platform <b>{form.platform}</b> telah tersimpan.
        </div>
        <button onClick={() => { setForm(initialForm); setStep(1); setSubmitted(false) }}
          style={{ padding: '10px 24px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
          Buat Campaign Baru
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <StepIndicator current={step} total={5} />

      {/* STEP 1 — Client & Platform */}
      {step === 1 && (
        <>
          <Card title="Pilih client">
            {clients.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#888', padding: '8px 0' }}>
                Belum ada client. Tambah client dulu di tab Data Input.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {clients.map(c => (
                  <button key={c.client_id} onClick={() => set('client_id', c.client_id)}
                    style={{
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: form.client_id === c.client_id ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.12)',
                      background: form.client_id === c.client_id ? '#E6F1FB' : '#fff',
                    }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: form.client_id === c.client_id ? '#185FA5' : '#1a1a1a' }}>{c.client_name}</div>
                    {c.business_type && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{c.business_type}</div>}
                  </button>
                ))}
              </div>
            )}
            {errors.client_id && <div style={{ color: '#E24B4A', fontSize: '11px', marginTop: '10px' }}>⚠ {errors.client_id}</div>}
          </Card>

          <Card title="Pilih platform advertising">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => { set('platform', p); set('objective', '') }}
                  style={{
                    padding: '20px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                    border: form.platform === p ? `2px solid ${platformColor(p)}` : '0.5px solid rgba(0,0,0,0.12)',
                    background: form.platform === p ? platformBg(p) : '#fff', transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>
                    {p === 'Meta' ? '📘' : p === 'Google' ? '🔍' : '🎵'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: form.platform === p ? platformColor(p) : '#1a1a1a' }}>{p} Ads</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {p === 'Meta' ? 'Facebook & Instagram' : p === 'Google' ? 'Search, Display & YouTube' : 'TikTok For You & more'}
                  </div>
                </button>
              ))}
            </div>
            {errors.platform && <div style={{ color: '#E24B4A', fontSize: '11px', marginTop: '10px' }}>⚠ {errors.platform}</div>}
          </Card>

          {form.platform && (
            <Card title="Pilih objective campaign">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {OBJECTIVES[form.platform].map(obj => (
                  <button key={obj} onClick={() => set('objective', obj)}
                    style={{
                      padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      border: form.objective === obj ? `1.5px solid ${platformColor(form.platform)}` : '0.5px solid rgba(0,0,0,0.12)',
                      background: form.objective === obj ? platformBg(form.platform) : '#fff',
                    }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: form.objective === obj ? platformColor(form.platform) : '#1a1a1a' }}>{obj}</div>
                  </button>
                ))}
              </div>
              {errors.objective && <div style={{ color: '#E24B4A', fontSize: '11px', marginTop: '10px' }}>⚠ {errors.objective}</div>}
            </Card>
          )}
        </>
      )}

      {/* STEP 2 — Campaign Settings */}
      {step === 2 && (
        <>
          <Card title="Campaign settings">
            <Grid cols={2}>
              <FieldGroup>
                <Label required>Nama campaign</Label>
                <Input value={form.campaign_name} onChange={v => set('campaign_name', v)} placeholder="e.g. Retarget - Cart Abandon - Apr 2026" />
                {errors.campaign_name && <span style={{ fontSize: '10px', color: '#E24B4A', marginTop: '3px' }}>{errors.campaign_name}</span>}
              </FieldGroup>
              <FieldGroup>
                <Label required>Tipe budget</Label>
                <Select value={form.budget_type} onChange={v => set('budget_type', v)} options={['daily', 'lifetime']} />
              </FieldGroup>
              {form.budget_type === 'daily' ? (
                <FieldGroup>
                  <Label required>Daily budget (Rp)</Label>
                  <Input value={form.daily_budget} onChange={v => set('daily_budget', v)} placeholder="e.g. 500000" type="number" />
                  {errors.daily_budget && <span style={{ fontSize: '10px', color: '#E24B4A', marginTop: '3px' }}>{errors.daily_budget}</span>}
                </FieldGroup>
              ) : (
                <FieldGroup>
                  <Label required>Lifetime budget (Rp)</Label>
                  <Input value={form.lifetime_budget} onChange={v => set('lifetime_budget', v)} placeholder="e.g. 15000000" type="number" />
                  {errors.lifetime_budget && <span style={{ fontSize: '10px', color: '#E24B4A', marginTop: '3px' }}>{errors.lifetime_budget}</span>}
                </FieldGroup>
              )}
              <FieldGroup>
                <Label>Start date</Label>
                <Input value={form.start_date} onChange={v => set('start_date', v)} type="date" />
              </FieldGroup>
              <FieldGroup>
                <Label>End date</Label>
                <Input value={form.end_date} onChange={v => set('end_date', v)} type="date" />
              </FieldGroup>
            </Grid>
          </Card>

          <Card title={`Platform metrics — ${form.platform}`}>
            <Grid cols={2}>
              {(METRICS_BY_PLATFORM[form.platform] || []).map(m => (
                <FieldGroup key={m.key}>
                  <Label>{m.label}</Label>
                  {m.type === 'select' ? (
                    <Select value={form.metrics[m.key] || ''} onChange={v => setMetric(m.key, v)} options={m.placeholder.split('|')} />
                  ) : (
                    <Input value={form.metrics[m.key] || ''} onChange={v => setMetric(m.key, v)} placeholder={m.placeholder} type={m.type} />
                  )}
                </FieldGroup>
              ))}
            </Grid>
          </Card>
        </>
      )}

      {/* STEP 3 — Ad Set */}
      {step === 3 && (
        <>
          <Card title="Ad set settings">
            <Grid cols={2}>
              <FieldGroup>
                <Label required>Nama ad set</Label>
                <Input value={form.adset_name} onChange={v => set('adset_name', v)} placeholder="e.g. F 25-34 - Jakarta - Interest" />
                {errors.adset_name && <span style={{ fontSize: '10px', color: '#E24B4A', marginTop: '3px' }}>{errors.adset_name}</span>}
              </FieldGroup>
              <FieldGroup>
                <Label>Target lokasi</Label>
                <Input value={form.locations} onChange={v => set('locations', v)} placeholder="e.g. Indonesia, Jakarta" />
              </FieldGroup>
              <FieldGroup>
                <Label>Usia minimum</Label>
                <Input value={form.age_min} onChange={v => set('age_min', v)} type="number" placeholder="18" />
              </FieldGroup>
              <FieldGroup>
                <Label>Usia maksimum</Label>
                <Input value={form.age_max} onChange={v => set('age_max', v)} type="number" placeholder="65" />
              </FieldGroup>
              <FieldGroup>
                <Label>Gender</Label>
                <Select value={form.gender} onChange={v => set('gender', v)} options={['All', 'Male', 'Female']} />
              </FieldGroup>
            </Grid>
          </Card>

          <Card title="Placement">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(PLACEMENTS[form.platform] || []).map(p => (
                <button key={p} onClick={() => togglePlacement(p)}
                  style={{
                    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                    border: form.placements.includes(p) ? '1.5px solid #185FA5' : '0.5px solid rgba(0,0,0,0.12)',
                    background: form.placements.includes(p) ? '#E6F1FB' : '#fff',
                    fontSize: '11px', fontWeight: form.placements.includes(p) ? 500 : 400,
                    color: form.placements.includes(p) ? '#185FA5' : '#555',
                  }}>
                  {form.placements.includes(p) ? '✓ ' : ''}{p}
                </button>
              ))}
            </div>
            {errors.placements && <div style={{ color: '#E24B4A', fontSize: '11px', marginTop: '8px' }}>⚠ {errors.placements}</div>}
          </Card>
        </>
      )}

      {/* STEP 4 — Creatives */}
      {step === 4 && (
        <>
          {form.ads.map((ad, idx) => (
            <Card key={ad.id} title={`Ad #${idx + 1}${ad.name ? ` — ${ad.name}` : ''}`}>
              <Grid cols={2}>
                <FieldGroup>
                  <Label required>Nama ad</Label>
                  <Input value={ad.name} onChange={v => setAd(ad.id, 'name', v)} placeholder="e.g. Sale Countdown - UGC Video" />
                  {errors[`ad_name_${idx}`] && <span style={{ fontSize: '10px', color: '#E24B4A', marginTop: '3px' }}>{errors[`ad_name_${idx}`]}</span>}
                </FieldGroup>
                <FieldGroup>
                  <Label required>Headline</Label>
                  <Input value={ad.headline} onChange={v => setAd(ad.id, 'headline', v)} placeholder="e.g. Diskon 50% Hari Ini Saja!" />
                  {errors[`ad_headline_${idx}`] && <span style={{ fontSize: '10px', color: '#E24B4A', marginTop: '3px' }}>{errors[`ad_headline_${idx}`]}</span>}
                </FieldGroup>
                <FieldGroup>
                  <Label>Destination URL</Label>
                  <Input value={ad.destination_url} onChange={v => setAd(ad.id, 'destination_url', v)} placeholder="https://yoursite.com/landing" />
                </FieldGroup>
                <FieldGroup>
                  <Label>Call to Action</Label>
                  <Select value={ad.cta} onChange={v => setAd(ad.id, 'cta', v)} options={CTA_OPTIONS} />
                </FieldGroup>
              </Grid>
              <div style={{ marginTop: '14px' }}>
                <Label>Primary text / copy</Label>
                <textarea value={ad.primary_text} onChange={e => setAd(ad.id, 'primary_text', e.target.value)}
                  placeholder="Tulis copy iklan di sini..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', color: '#1a1a1a', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginTop: '14px' }}>
                <Label>Upload media (gambar / video)</Label>
                <div onClick={() => fileRefs.current[ad.id]?.click()}
                  style={{ border: '1.5px dashed rgba(0,0,0,0.15)', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#fafaf9', marginBottom: ad.media_previews.length > 0 ? '10px' : '0' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>📁</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Klik untuk upload gambar atau video</div>
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>JPG, PNG, MP4, MOV — max 100MB</div>
                  <input ref={el => { fileRefs.current[ad.id] = el }} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleMedia(ad.id, e.target.files)} />
                </div>
                {ad.media_previews.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ad.media_previews.map((src, i) => (
                      <div key={i} style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.ads.length > 1 && (
                <button onClick={() => removeAd(ad.id)}
                  style={{ marginTop: '12px', padding: '6px 12px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>
                  Hapus Ad ini
                </button>
              )}
            </Card>
          ))}
          <button onClick={addAd}
            style={{ width: '100%', padding: '12px', border: '1.5px dashed rgba(0,0,0,0.15)', borderRadius: '10px', background: '#fafaf9', color: '#185FA5', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            + Tambah Ad
          </button>
        </>
      )}

      {/* STEP 5 — Review */}
      {step === 5 && (
        <>
          <Card title="Review campaign sebelum submit">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client & Platform</div>
                <ReviewRow label="Client" value={selectedClient?.client_name || '—'} highlight />
                <ReviewRow label="Platform" value={form.platform} />
                <ReviewRow label="Objective" value={form.objective} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campaign</div>
                <ReviewRow label="Nama" value={form.campaign_name} />
                <ReviewRow label="Budget" value={form.budget_type === 'daily' ? `Rp ${Number(form.daily_budget).toLocaleString('id')}/hari` : `Rp ${Number(form.lifetime_budget).toLocaleString('id')} lifetime`} />
                <ReviewRow label="Periode" value={`${form.start_date || '—'} → ${form.end_date || '—'}`} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ad Set</div>
                <ReviewRow label="Nama" value={form.adset_name} />
                <ReviewRow label="Usia" value={`${form.age_min} – ${form.age_max}`} />
                <ReviewRow label="Gender" value={form.gender} />
                <ReviewRow label="Lokasi" value={form.locations} />
                <ReviewRow label="Placement" value={form.placements.join(', ') || '—'} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Metrics</div>
                {Object.entries(form.metrics).map(([k, v]) => (
                  <ReviewRow key={k} label={k.replace(/_/g, ' ')} value={v} />
                ))}
              </div>
            </div>
          </Card>

          <Card title={`Ads / Creatives (${form.ads.length} ad)`}>
            {form.ads.map((ad, i) => (
              <div key={ad.id} style={{ padding: '12px', background: '#fafaf9', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: '#185FA5' }}>Ad #{i + 1} — {ad.name || '(tanpa nama)'}</div>
                <Grid cols={2}>
                  <ReviewRow label="Headline" value={ad.headline || '—'} />
                  <ReviewRow label="CTA" value={ad.cta} />
                  <ReviewRow label="URL" value={ad.destination_url || '—'} />
                  <ReviewRow label="Media" value={ad.media_files.length > 0 ? `${ad.media_files.length} file` : 'Belum ada'} />
                </Grid>
                {ad.primary_text && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#555', background: '#fff', padding: '8px', borderRadius: '6px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                    {ad.primary_text}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          style={{ padding: '10px 20px', borderRadius: '8px', border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', color: '#555', fontSize: '12px', cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.4 : 1 }}>
          ← Kembali
        </button>
        <div style={{ fontSize: '11px', color: '#888' }}>Step {step} dari 5</div>
        {step < 5 ? (
          <button onClick={handleNext}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#185FA5', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
            Lanjut →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#3B6D11', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 500, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Menyimpan...' : 'Submit Campaign ✓'}
          </button>
        )}
      </div>
    </div>
  )
}