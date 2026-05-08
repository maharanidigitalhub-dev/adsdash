import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'founder' | 'admin' | 'client'
  client_id: string | null
  client_name?: string
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

export default function UserManagementTab() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'client',
    client_id: '',
  })

  useEffect(() => {
    fetchUsers()
    fetchClients()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*, dim_clients(client_name)')
      .order('role')

    if (profiles) {
      setUsers(profiles.map((p: any) => ({
        ...p,
        client_name: Array.isArray(p.dim_clients) ? p.dim_clients[0]?.client_name : p.dim_clients?.client_name,
      })))
    }
    setLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase.from('dim_clients').select('client_id, client_name').eq('is_active', true).order('client_name')
    if (data) setClients(data)
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
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal membuat user')
      } else {
        setSuccessMsg(`User ${form.email} berhasil dibuat!`)
        setForm({ email: '', password: '', full_name: '', role: 'client', client_id: '' })
        setShowAddUser(false)
        fetchUsers()
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
    setSubmitting(false)
  }

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password minimal 6 karakter')
      return
    }
    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal reset password')
      } else {
        setSuccessMsg('Password berhasil direset!')
        setShowResetPassword(null)
        setNewPassword('')
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
    setSubmitting(false)
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Hapus user ${email}? Tindakan ini tidak bisa dibatalkan.`)) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal hapus user')
      } else {
        setSuccessMsg(`User ${email} berhasil dihapus`)
        fetchUsers()
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
    setSubmitting(false)
  }

  const handleUpdateRole = async (userId: string, newRole: string, clientId: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, client_id: clientId })
      .eq('id', userId)

    if (error) {
      setErrorMsg('Gagal update role: ' + error.message)
    } else {
      setSuccessMsg('Role berhasil diupdate!')
      fetchUsers()
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {successMsg && <div style={{ background: '#EAF3DE', color: '#27500A', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>✓ {successMsg}</div>}
      {errorMsg && <div style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>⚠ {errorMsg}</div>}

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
            {form.role === 'client' && (
              <div>
                <Label>Assign ke Client</Label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: '#fff', outline: 'none' }}>
                  <option value="">— Pilih Client —</option>
                  {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
              </div>
            )}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  {['Nama', 'Email', 'Role', 'Client', 'Password', 'Hapus'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#888', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <>
                    <tr key={user.id} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontWeight: 500 }}>{user.full_name || '—'}</td>
                      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', color: '#888' }}>{user.email}</td>
                      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <select value={user.role}
                          onChange={e => handleUpdateRole(user.id, e.target.value, user.client_id)}
                          style={{ fontSize: '11px', padding: '2px 6px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '4px', background: '#fff', outline: 'none' }}>
                          <option value="client">client</option>
                          <option value="admin">admin</option>
                          <option value="founder">founder</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <select value={user.client_id || ''}
                          onChange={e => handleUpdateRole(user.id, user.role, e.target.value || null)}
                          style={{ fontSize: '11px', padding: '2px 6px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '4px', background: '#fff', outline: 'none' }}>
                          <option value="">— Tidak ada —</option>
                          {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <button onClick={() => { setShowResetPassword(showResetPassword === user.id ? null : user.id); setNewPassword('') }}
                          style={{ fontSize: '10px', padding: '3px 8px', background: '#E6F1FB', color: '#185FA5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
                          Reset
                        </button>
                      </td>
                      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <button onClick={() => handleDeleteUser(user.id, user.email)}
                          style={{ fontSize: '10px', padding: '3px 8px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                    {showResetPassword === user.id && (
                      <tr key={`reset-${user.id}`}>
                        <td colSpan={6} style={{ padding: '8px', background: '#f5f5f3', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>Password baru untuk {user.email}:</span>
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
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
