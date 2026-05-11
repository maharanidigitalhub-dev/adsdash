import type { Tab } from '../types/global'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  role?: string
}

export default function TabNav({ activeTab, onTabChange, role }: Props) {
  const canAccessAdmin = role === 'founder' || role === 'admin'

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'campaign' as Tab, label: 'Campaign' },
    //{ id: 'creative' as Tab, label: 'Creative' },
    //{ id: 'audience' as Tab, label: 'Audience' },
    { id: 'budget' as Tab, label: 'Budget' },
    { id: 'conversion' as Tab, label: 'Conversion / ROAS' },
    ...(canAccessAdmin ? [
      { id: 'settings' as Tab, label: 'Ads Setting' },
      { id: 'campaigns' as Tab, label: 'Update Setting' },
      { id: 'datainput' as Tab, label: 'Data Input' },
      ...(role === 'founder' ? [{ id: 'users' as Tab, label: 'Users' }] : []),
    ] : []),
  ]

  return (
    <div style={{
      background: '#ffffff', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
      padding: '0 20px', display: 'flex', overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)}
          style={{
            fontSize: '12px', padding: '10px 16px', border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #185FA5' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === tab.id ? '#185FA5' : '#888',
            fontWeight: activeTab === tab.id ? 500 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
