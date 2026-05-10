import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const kpis = [
  { label: 'Total Unique Reach', value: '2,84M', delta: '+9.3%', up: true },
  { label: 'Avg Frequency', value: '2.4x', delta: '+0.3x', up: false },
  { label: 'Top Audience Segment', value: 'F 25–34', delta: 'CTR 2.1%', up: true },
]

const ageData = [
  { age: '18-24', ctr: 1.62, cpa: 31 },
  { age: '25-34', ctr: 2.14, cpa: 22 },
  { age: '35-44', ctr: 1.88, cpa: 26 },
  { age: '45-54', ctr: 1.41, cpa: 34 },
  { age: '55+', ctr: 0.92, cpa: 48 },
]

const genderData = [
  { platform: 'Meta', Female: 58, Male: 36, Unknown: 6 },
  { platform: 'Google', Female: 44, Male: 49, Unknown: 7 },
  { platform: 'TikTok', Female: 62, Male: 33, Unknown: 5 },
]

const treemapItems = [
  { label: 'Mobile Feed', sub: 'Rp 38,4M · CTR 1.72%', bg: '#B5D4F4', color: '#0C447C', flex: 3 },
  { label: 'Mobile Reels', sub: 'Rp 14,1M · 2.1%', bg: '#97C459', color: '#27500A', flex: 1.5 },
  { label: 'Desktop Feed', sub: 'Rp 11,2M · 1.1%', bg: '#EF9F27', color: '#412402', flex: 1.2 },
  { label: 'Story', sub: 'Rp 9,8M · 1.4%', bg: '#C0DD97', color: '#3B6D11', flex: 1 },
  { label: 'Search', sub: 'Rp 8,2M · 1.2%', bg: '#D3D1C7', color: '#444441', flex: 0.9 },
]

const audienceTable = [
  { name: 'Cart Abandoner 30d', type: 'Custom', ctr: '2.41%', cpa: 'Rp 18K', roas: '5.4x', roasVal: 5.4 },
  { name: 'Purchaser LAL 1%', type: 'LAL', ctr: '1.95%', cpa: 'Rp 22K', roas: '4.2x', roasVal: 4.2 },
  { name: 'Web Visitor 14d', type: 'Custom', ctr: '1.82%', cpa: 'Rp 24K', roas: '3.8x', roasVal: 3.8 },
  { name: 'Beauty Interest', type: 'Interest', ctr: '1.22%', cpa: 'Rp 43K', roas: '2.1x', roasVal: 2.1 },
  { name: 'Broad - F 25-44', type: 'Broad', ctr: '1.08%', cpa: 'Rp 51K', roas: '1.7x', roasVal: 1.7 },
]

function typeBadge(t: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Custom: { bg: '#E6F1FB', color: '#185FA5' },
    LAL: { bg: '#EAF3DE', color: '#27500A' },
    Interest: { bg: '#FAEEDA', color: '#633806' },
    Broad: { bg: '#F1EFE8', color: '#5F5E5A' },
  }
  const s = map[t] || map['Broad']
  return (
    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>
      {t}
    </span>
  )
}

function getRoasColor(v: number) {
  if (v >= 3) return '#3B6D11'
  if (v >= 2) return '#854F0B'
  return '#A32D2D'
}

export default function AudienceTab(_props?: { globalData?: unknown }) {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '10px', marginBottom: '16px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#f0efea', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#1a1a1a' }}>{k.value}</div>
            <div style={{ fontSize: '11px', marginTop: '3px', color: k.up ? '#3B6D11' : '#A32D2D' }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

        {/* Age Group Chart */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>CTR & CPA by age group</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}K`} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="ctr" name="CTR (%)" fill="#378ADD" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="cpa" name="CPA (Rp ribu)" fill="#E24B4A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {[['CTR (%)', '#378ADD'], ['CPA (Rp ribu)', '#E24B4A']].map(([l, c]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </div>

        {/* Gender Chart */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Spend distribution by gender</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={genderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="platform" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="Female" stackId="a" fill="#378ADD" />
              <Bar dataKey="Male" stackId="a" fill="#85B7EB" />
              <Bar dataKey="Unknown" stackId="a" fill="#D3D1C7" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {[['Female', '#378ADD'], ['Male', '#85B7EB'], ['Unknown', '#D3D1C7']].map(([l, c]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#888' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* Treemap */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Spend by device & placement</div>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '12px' }}>Ukuran = spend — warna = CTR relatif</div>
          <div style={{ display: 'flex', gap: '3px', height: '160px' }}>
            {treemapItems.map(item => (
              <div key={item.label} style={{
                flex: item.flex,
                background: item.bg,
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '8px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: item.color }}>{item.label}</div>
                <div style={{ fontSize: '9px', color: item.color, opacity: 0.8 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Table */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '12px' }}>Audience performance (Meta)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                {['Audience', 'Type', 'CTR', 'CPA', 'ROAS'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audienceTable.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.name}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{typeBadge(row.type)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.ctr}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>{row.cpa}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: getRoasColor(row.roasVal), fontWeight: 500 }}>{row.roas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}