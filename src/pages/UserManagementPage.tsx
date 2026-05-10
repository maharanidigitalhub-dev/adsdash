// src/pages/UserManagementPage.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Search, Shield, ChevronDown,
  MoreVertical, UserCheck, UserX, Pencil, X, Check,
  AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { supabase, type Profile, type UserRole } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Types ─────────────────────────────────────────────────
interface AddUserForm {
  email: string
  full_name: string
  password: string
  role: UserRole
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  manager: 'Manager',
  staff: 'Staff',
}

const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-amber-100 text-amber-700 border-amber-200',
  staff: 'bg-teal-100 text-teal-700 border-teal-200',
}

// ─── Sub-components ────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role]}`}>
      <Shield className="w-3 h-3" />
      {ROLE_LABELS[role]}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

// ─── Add User Modal ─────────────────────────────────────────
function AddUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<AddUserForm>({
    email: '',
    full_name: '',
    password: '',
    role: 'staff',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Buat user via Supabase Admin API (via edge function atau service role)
      // Karena kita pakai anon key di frontend, kita gunakan signUp dulu
      // lalu update role via profile
      const { data, error: signUpError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        user_metadata: { full_name: form.full_name },
        email_confirm: true, // langsung konfirmasi tanpa email
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Update role sesuai pilihan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: form.role, full_name: form.full_name })
          .eq('id', data.user.id)

        if (profileError) throw profileError
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat user'
      if (msg.includes('already registered')) {
        setError('Email ini sudah terdaftar.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tambah User Baru</h2>
            <p className="text-xs text-gray-500 mt-0.5">Isi data untuk membuat akun baru</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Maharani Putri"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@example.com"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 karakter"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="relative">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white transition-all"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="superadmin">Super Admin</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {form.role === 'superadmin' && 'Akses penuh ke semua fitur termasuk manajemen user.'}
              {form.role === 'manager' && 'Dapat import data customer dan lihat semua laporan.'}
              {form.role === 'staff' && 'Hanya dapat input data iklan dan lihat data sendiri.'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Menyimpan...' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Role Modal ────────────────────────────────────────
function EditRoleModal({
  profile,
  onClose,
  onSuccess,
}: {
  profile: Profile
  onClose: () => void
  onSuccess: () => void
}) {
  const [role, setRole] = useState<UserRole>(profile.role)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    await supabase.from('profiles').update({ role }).eq('id', profile.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Ubah Role</h2>
        <p className="text-sm text-gray-500 mb-4">{profile.full_name || profile.email}</p>

        <div className="space-y-2 mb-6">
          {(['superadmin', 'manager', 'staff'] as UserRole[]).map((r) => (
            <label
              key={r}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                role === r ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="accent-indigo-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[r]}</p>
              </div>
              {role === r && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading || role === profile.role}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────
export function UserManagementPage() {
  const { profile: currentProfile } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data as Profile[] ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Klik di luar menu → tutup
  useEffect(() => {
    const close = () => setActiveMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const toggleActive = async (user: Profile) => {
    setActionLoading(user.id)
    await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)
    await fetchUsers()
    setActionLoading(null)
    setActiveMenu(null)
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    superadmin: users.filter((u) => u.role === 'superadmin').length,
    manager: users.filter((u) => u.role === 'manager').length,
    staff: users.filter((u) => u.role === 'staff').length,
    active: users.filter((u) => u.is_active).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchUsers}
        />
      )}
      {editingProfile && (
        <EditRoleModal
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSuccess={fetchUsers}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Manajemen User
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Kelola akun dan role pengguna adsdash
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total User', value: stats.total, color: 'text-gray-900' },
            { label: 'Super Admin', value: stats.superadmin, color: 'text-purple-600' },
            { label: 'Manager', value: stats.manager, color: 'text-amber-600' },
            { label: 'Aktif', value: stats.active, color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="all">Semua Role</option>
              <option value="superadmin">Super Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada user ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Dibuat</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">
                              {u.full_name || '—'}
                              {u.id === currentProfile?.id && (
                                <span className="ml-1.5 text-xs text-indigo-500 font-normal">(kamu)</span>
                              )}
                            </p>
                            <p className="text-gray-400 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge active={u.is_active} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {u.id !== currentProfile?.id && (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              {actionLoading === u.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <MoreVertical className="w-4 h-4" />
                              }
                            </button>

                            {activeMenu === u.id && (
                              <div className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44">
                                <button
                                  onClick={() => { setEditingProfile(u); setActiveMenu(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Ubah Role
                                </button>
                                <button
                                  onClick={() => toggleActive(u)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                    u.is_active
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-green-600 hover:bg-green-50'
                                  }`}
                                >
                                  {u.is_active
                                    ? <><UserX className="w-3.5 h-3.5" /> Nonaktifkan</>
                                    : <><UserCheck className="w-3.5 h-3.5" /> Aktifkan</>
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/30">
              <p className="text-xs text-gray-400">
                Menampilkan {filtered.length} dari {users.length} user
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
