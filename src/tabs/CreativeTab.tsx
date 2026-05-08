import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

const kpis = [
  { label: 'Active Creatives', value: '38', delta: '+6 vs prev', up: true },
  { label: 'Avg Hook Rate (video)', value: '31.4%', delta: '+4.2%', up: true },
  { label: 'Avg CTR', value: '1.48%', delta: '-0.5%', up: false },
  { label: 'Top Format', value: 'Video', delta: 'CTR 1.82%', up: true },
]

const formatData = [
  { format: 'Video', ctr: 1.82 },
  { format: 'Carousel', ctr: 1.61 },
  { format: 'Image', ctr: 1.52 },
  { format: 'Responsive', ctr: 0.96 },
]

const creatives = [
  { rank: 1, name: 'Sale Countdown - UGC', platform: 'Meta', format: 'Video', spend: 'Rp 6,1M', ctr: '2.41%', roas: '5.8x', roasVal: 5.8, hook: '38.2%', thumb: 'V' },
  { rank: 2, name: 'Flash Sale Banner', platform: 'Meta', format: 'Image', spend: 'Rp 4,8M', ctr: '1.98%', roas: '4.6x', roasVal: 4.6, hook: '—', thumb: 'I' },
  { rank: 3, name: 'Testimonial - Happy Customer', platform: 'TikTok', format: 'Video', spend: 'Rp 5,2M', ctr: '1.74%', roas: '4.1x', roasVal: 4.1, hook: '29.7%', thumb: 'V' },
  { rank: 4, name: 'Product Collection - New Arrival', platform: 'Meta', format: 'Carousel', spend: 'Rp 3,7M', ctr: '1.61%', roas: '3.9x', roasVal: 3.9, hook: '—', thumb: 'C' },
  { rank: 5, name: 'Brand Awareness Video', platform: 'Google', format: 'Video', spend: 'Rp 3,2M', ctr: '1.44%', roas: '3.2x', roasVal: 3.2, hook: '24.1%', thumb: 'V' },
  { rank: 6, name: 'Retarget Display Banner', platform: 'Google', format: 'Responsive', spend: 'Rp 2,8M', ctr: '1.21%', roas: '2.9x', roasVal: 2.9, hook: '—', thumb: 'R' },
]

const heatmapData = [
  { name: 'Sale Countdown', w1: 2.8, w2: 2.4, w3: 1.9, w4: 1.2 },
  { name: 'Flash Sale Banner', w1: 2.2, w2: 2.1, w3: 1.8, w4: 1.6 },
  { name: 'Testimonial UGC', w1: 1.6, w2: 1.8, w3: 1.9, w4: 1.7 },
  { name: 'Product Carousel', w1: 1.4, w2: 1.1, w3: 0.9, w4: 0.6 },
  { name: 'Display Banner', w1: 1.1, w2: 1.0, w3: 0.8, w4: 0.7 },
]

function getHeatColor(val: number) {
  if (val >= 2.5) return { bg: '#639922', color: '#173404' }
  if (val >= 2.0) return { bg: '#97C459', color: '#27500A' }
  if (val >= 1.5) return { bg: '#C0DD97', color: '#3B6D11' }
  if (val >= 1.0) return { bg: '#EF9F27', color: '#412402' }
  return { bg: '#E24B4A', color: '#501313' }
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
  return (
    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: map[p].bg, color: map[p].color }}>
      {p}
    </span>
  )
}

function formatBadge(f: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Video: { bg: '#EEEDFE', color: '#534AB7' },
    Image: { bg: '#EAF3DE', color: '#27500A' },
    Carousel: { bg: '#FAEEDA', color: '#633806' },
    Responsive: { bg: '#F1EFE8', color: '#5F5E5A' },
  }
  const s = map[f] || map['Responsive']
  return (
    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>
      {f}
    </span>
  )
}

function thumbBg(t: string) {
  if (t === 'V') return { bg: '#E6F1FB', color: '#185FA5', label: '▶ Video' }
  if (t === 'I') return { bg: '#EAF3DE', color: '#27500A', label: 'IMG' }
  if (t === 'C') return { bg: '#EEEDFE', color: '#534AB7', label: 'Carousel' }
  return { bg: '#F1EFE8', color: '#5F5E5A', label: 'Responsive' }
}

export default function CreativeTab() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px', marginBottom: '16px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', color: k.up ? '#3B6D11' : '#A32D2D' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Creative Leaderboard */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Top creatives by ROAS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: '10px' }}>
          {creatives.map(c => {
            const th = thumbBg(c.thumb)
            const isTop = c.rank === 1
            return (
              <div key={c.rank} style={{
                border: isTop ? '1.5px solid #185FA5' : '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: '8px', overflow: 'hidden'
              }}>
                <div style={{ height: '64px', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: th.color }}>
                  {th.label}
                </div>
                <div style={{ padding: '8px' }}>
                  {isTop && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: '#185FA5', color: '#fff', fontWeight: 500 }}>Top Creative</span>
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {platformBadge(c.platform)}
                    {formatBadge(c.format)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {[['CTR', c.ctr], ['ROAS', c.roas], ['Spend', c.spend], ['Hook', c.hook]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: '10px', color: '#888' }}>{l}</div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: l === 'ROAS' ? getRoasColor(c.roasVal) : '#1a1a1a' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* CTR by Format */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>CTR by creative format</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={formatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="format" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} domain={[0, 2.5]} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <ReferenceLine y={1.5} stroke="#E24B4A" strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="ctr" radius={[4, 4, 0, 0]} fill="#378ADD" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '6px' }}>Garis merah = rata-rata industri (1.5%)</div>
        </div>

        {/* Fatigue Heatmap */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Creative fatigue heatmap — CTR per minggu</div>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '12px' }}>Merah = CTR turun / potensi fatigue</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: '#888' }}></div>
            {['W1', 'W2', 'W3', 'W4'].map(w => (
              <div key={w} style={{ fontSize: '10px', color: '#888', textAlign: 'center', padding: '2px' }}>{w}</div>
            ))}
            {heatmapData.map(row => (
              <>
                <div key={row.name} style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                {[row.w1, row.w2, row.w3, row.w4].map((val, i) => {
                  const { bg, color } = getHeatColor(val)
                  return (
                    <div key={i} style={{ height: '28px', borderRadius: '3px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, color }}>
                      {val.toFixed(1)}%
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}