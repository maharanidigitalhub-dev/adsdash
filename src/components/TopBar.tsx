import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onSignOut?: () => void
  userEmail?: string
  role?: string
  onClientChange?: (clientId: string) => void
  selectedClient?: string
}

const platforms = ['All', 'Meta', 'Google', 'TikTok']
const periods = ['Last 7 days', 'Last 30 days', 'Custom']

function roleBadge(role: string) {
  const map: Record<string, { bg: string; color: string }> = {
    founder: { bg: '#EEEDFE', color: '#534AB7' },
    admin: { bg: '#E6F1FB', color: '#185FA5' },
    client: { bg: '#EAF3DE', color: '#27500A' },
  }
  const s = map[role] || map['client']
  return (
    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>
      {role}
    </span>
  )
}

export default function TopBar({ onSignOut, userEmail, role, onClientChange, selectedClient }: Props) {
  const [activePlatform, setActivePlatform] = useState('All')
  const [activePeriod, setActivePeriod] = useState('Last 30 days')
  const [clients, setClients] = useState<{ client_id: string; client_name: string }[]>([])

  const canSeeAllClients = role === 'founder' || role === 'admin'

  useEffect(() => {
    if (canSeeAllClients) {
      supabase.from('dim_clients').select('client_id, client_name')
        .eq('is_active', true).order('client_name')
        .then(({ data }) => { if (data) setClients(data) })
    }
  }, [role])

  return (
    <div style={{
      background: '#ffffff', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
      padding: '10px 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
      position: 'relative', zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a' }}>
        Ads<span style={{ color: '#185FA5' }}>Dash</span>
        <span style={{ color: '#888', fontWeight: 400, marginLeft: '8px', fontSize: '13px' }}>Omnichannel</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Client Selector — hanya untuk founder/admin */}
        {canSeeAllClients && (
          <>
            <span style={{ fontSize: '11px', color: '#888' }}>Client:</span>
            <select
              value={selectedClient || 'all'}
              onChange={e => onClientChange?.(e.target.value)}
              style={{
                fontSize: '11px', padding: '4px 8px', borderRadius: '99px',
                border: '0.5px solid #d1d1d1', background: selectedClient && selectedClient !== 'all' ? '#185FA5' : '#fff',
                color: selectedClient && selectedClient !== 'all' ? '#fff' : '#666',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
              ))}
            </select>
          </>
        )}

        <span style={{ fontSize: '11px', color: '#888' }}>Platform:</span>
        {platforms.map(p => (
          <button key={p} onClick={() => setActivePlatform(p)}
            style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '99px',
              border: '0.5px solid #d1d1d1',
              background: activePlatform === p ? '#185FA5' : '#fff',
              color: activePlatform === p ? '#fff' : '#666',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{p}</button>
        ))}

        <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>Period:</span>
        {periods.map(p => (
          <button key={p} onClick={() => setActivePeriod(p)}
            style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '99px',
              border: '0.5px solid #d1d1d1',
              background: activePeriod === p ? '#185FA5' : '#fff',
              color: activePeriod === p ? '#fff' : '#666',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{p}</button>
        ))}
      </div>

      {/* User Info */}
      {userEmail && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {role && roleBadge(role)}
          <span style={{ fontSize: '11px', color: '#888' }}>{userEmail}</span>
          <button onClick={onSignOut}
            style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #d1d1d1', background: '#fff', color: '#666', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}