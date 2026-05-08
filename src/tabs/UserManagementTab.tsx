import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'founder' | 'admin' | 'client'
  assigned_clients: string[]
}

interface Client {
  client_id: string
  client_name: string
}

function roleBadge(role: string) {
  const map: Record<string, { bg: string; color: string }> = {
    founder: { bg: '#EEEDFE', color: '#534AB7' },
    admin: { bg: '#E6F1FB', color: '#185FA5' },
    client: { bg: '#EAF3DE', color: '#27500A' },
  }
  const s = map[role] || map['client']
  return <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: 500, background: s.bg, color: s.color }}>{role}</span>
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
      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', outline: 'none' }} />
  )
}

function ClientCheckboxes({ clients, selected, onChange }: { clients: Client[], selected: string[], onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id))
    else onChange([...selected, id])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
      {clients.map(c => (
        <label key={c.client_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
          padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
          border: selected.includes(c.client_id) ? '1.5px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)',
          background: selected.includes(c.client_id) ? '#E6F1FB' : '#fff',
          color: selected.includes(c.client_id) ? '#185FA5' : '#555',
        }}>
          <input type="checkbox" checked={selected.includes(c.client_id)} onChange={() => toggle(c.client_id)}
            style={{ display: 'none' }} />
          {selected.includes(c.client_id) ? '✓ ' : ''}{c.client_name}
        </label>
      ))}
      {clients.length === 0 && <span style={{ fontSize: '11px', color: '#888' }}>Belum ada client</span>}
    </div>
  )
}

export default function UserManagementTab() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'client', client_ids: [] as string[],
  })

  useEffect(() => {
    fetchUsers()
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data } = await supabase.from('dim_clients').select('client_id, client_name').eq('is_active', true).order('client_name')
    if (data) setClients(data)
  }

  const fetchUsers = async () => {
    setLoading(true)

    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role').order('role')
    const { data: userClients } = await supabase.from('user_clients').select('user_id, client_id')

    if (profiles) {
      const mapped = profiles.map((p: any) => ({
        ...p,
        assigned_clients: userClients?.filter(uc => uc.user_id === p.id).map(uc => uc.client_id) || [],
      }))
      setUsers(mapped)
    }
    setLoading(false)
  }

  const handleAddUser = async () => {
    if (!form.email || !form.password || !form.role) {
      setErrorMsg('Email, password, dan role wajib diisi')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          client_ids: form.client_ids,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal membuat user')
      } else {
        setSuccessMsg(`User ${form.email} berhasil dibuat!`)
        setForm({ email: '', password: '', full_name: '', role: 'client', client_ids: [] })
        setShowAddUser(false)
        fetchUsers()
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
    setSubmitting(false)
  }

  const handleUpdateClients = async (userId: string, clientIds: string[]) => {
    // Hapus semua assignment lama
    await supabase.from('user_clients').delete().eq('user_id', userId)
    // Insert assignment baru
    if (clientIds.length > 0) {
      await supabase.from('user_clients').insert(clientIds.map(cid => ({ user_id: userId, client_id: cid })))
    }
    setSuccessMsg('Client assignment berhasil diupdate!')
    fetchUsers()
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) setErrorMsg('Gagal update role: ' + error.message)
    else { setSuccessMsg('Role berhasil diupdate!'); fetchUsers() }
  }

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) { setErrorMsg('Password minimal 6 karakter'); return }
    setSubmitting(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) setErrorMsg(data.error || 'Gagal reset password')
      else { setSuccessMsg('Password berhasil direset!'); setShowResetPassword(null); setNewPassword('') }
    } catch (err: any) { setErrorMsg(err.message) }
    setSubmitting(false)
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Hapus user ${email}?`)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) setErrorMsg(data.error || 'Gagal hapus user')
      else { setSuccessMsg(`User ${email} berhasil dihapus`); fetchUsers() }
    } catch (err: any) { setErrorMsg(err.message) }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {successMsg && <div onClick={() => setSuccessMsg('')} style={{ background: '#EAF3DE', color: '#27500A', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' }}>✓ {successMsg}</div>}
      {errorMsg && <div onClick={() => setErrorMsg('')} style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' }}>⚠ {errorMsg}</div>}

      {/* Add User Form */}
      {showAddUser && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '16px', paddingBottom: '10px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>Tambah user baru</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '14px', marginBottom: '14px' }}>
            <div><Label required>Email</Label><Input value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="user@email.com" /></div>
            <div><Label required>Password awal</Label><Input value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="text" placeholder="min. 6 karakter" /></div>
            <div><Label>Nama lengkap</Label><Input value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Nama User" /></div>
            <div>
              <Label required>Role</Label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', outline: 'none' }}>
                <option value="client">Client</option>
                <option value="admin">Admin</option>
                <option value="founder">Founder</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <Label>Assign ke Client (bisa lebih dari 1)</Label>
            <ClientCheckboxes clients={clients} selected={form.client_ids} onChange={ids => setForm(f => ({ ...f, client_ids: ids }))} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAddUser} disabled={submitting}
              style={{ padding: '8px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              {submitting ? 'Menyimpan...' : 'Simpan User'}
            </button>
            <button onClick={() => setShowAddUser(false)}
              style={{ padding: '8px 16px', background: '#fff', color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* User Table */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>User Management</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{users.length} user terdaftar</div>
          </div>
          <button onClick={() => setShowAddUser(!showAddUser)}
            style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            + Tambah User
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '12px' }}>Memuat...</div>
        ) : (
          <div>
            {users.map((user, i) => (
              <div key={user.id} style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                {/* User Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto auto', gap: '8px', alignItems: 'center', padding: '10px 12px', background: i % 2 === 0 ? '#fff' : '#fafaf9' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500 }}>{user.full_name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{user.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {user.assigned_clients.length > 0 ? (
                      user.assigned_clients.map(cid => {
                        const c = clients.find(x => x.client_id === cid)
                        return c ? (
                          <span key={cid} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}>{c.client_name}</span>
                        ) : null
                      })
                    ) : (
                      <span style={{ fontSize: '11px', color: '#aaa' }}>Belum ada client</span>
                    )}
                  </div>
                  <div>
                    <select value={user.role} onChange={e => handleUpdateRole(user.id, e.target.value)}
                      style={{ fontSize: '11px', padding: '3px 6px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '4px', background: '#fff', outline: 'none' }}>
                      <option value="client">client</option>
                      <option value="admin">admin</option>
                      <option value="founder">founder</option>
                    </select>
                  </div>
                  <button onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    style={{ fontSize: '10px', padding: '3px 8px', background: '#E6F1FB', color: '#185FA5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {expandedUser === user.id ? 'Tutup' : 'Edit Client'}
                  </button>
                  <button onClick={() => { setShowResetPassword(showResetPassword === user.id ? null : user.id); setNewPassword('') }}
                    style={{ fontSize: '10px', padding: '3px 8px', background: '#f5f5f3', color: '#555', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Reset PW
                  </button>
                  <button onClick={() => handleDeleteUser(user.id, user.email)}
                    style={{ fontSize: '10px', padding: '3px 8px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Hapus
                  </button>
                </div>

                {/* Edit Client Expanded */}
                {expandedUser === user.id && (
                  <div style={{ padding: '12px 14px', background: '#f5f5f3', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', fontWeight: 500 }}>Pilih client yang bisa diakses oleh {user.full_name || user.email}:</div>
                    <ClientCheckboxes
                      clients={clients}
                      selected={user.assigned_clients}
                      onChange={ids => {
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, assigned_clients: ids } : u))
                      }}
                    />
                    <button
                      onClick={() => handleUpdateClients(user.id, user.assigned_clients)}
                      style={{ marginTop: '10px', padding: '6px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                      Simpan Perubahan
                    </button>
                  </div>
                )}

                {/* Reset Password Expanded */}
                {showResetPassword === user.id && (
                  <div style={{ padding: '10px 14px', background: '#f5f5f3', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>Password baru:</span>
                    <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="min. 6 karakter"
                      style={{ padding: '6px 10px', fontSize: '11px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', outline: 'none', width: '200px' }} />
                    <button onClick={() => handleResetPassword(user.id)} disabled={submitting}
                      style={{ padding: '6px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>
                      {submitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowResetPassword(null); setNewPassword('') }}
                      style={{ padding: '6px 10px', background: '#fff', color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      Batal
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}