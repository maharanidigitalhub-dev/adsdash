// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, AuthUser, Permission, UserRole } from '../types'
import { PERMISSIONS } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  can: (permission: Permission) => boolean
  role: UserRole | null
  isSuperadmin: boolean  // = founder
  isManager: boolean     // = admin
  isStaff: boolean       // = client
  canManageUsers: boolean
  canImportData: boolean
  profile: Profile | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (authUser: User): Promise<Profile | null> => {
    // Coba fetch by id dulu
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!error && data) return data as Profile

    // Fallback: fetch by email kalau id mismatch
    if (authUser.email) {
      const { data: data2, error: error2 } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', authUser.email)
        .single()

      if (!error2 && data2) {
        // Auto-fix id mismatch
        await supabase
          .from('profiles')
          .update({ id: authUser.id })
          .eq('email', authUser.email)
        return data2 as Profile
      }
    }

    console.error('fetchProfile failed:', error)
    return null
  }

  const loadUser = async (authUser: User | null) => {
    if (!authUser) { setUser(null); return }
    const profile = await fetchProfile(authUser)
    setUser({ id: authUser.id, email: authUser.email!, profile })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadUser(session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await loadUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (err) {
      console.warn('signOut error:', err)
    }
    setUser(null)
    setSession(null)
    localStorage.removeItem('adsdash-auth-v2')
    sessionStorage.removeItem('adsdash-auth-v2')
  }

  const refreshProfile = async () => {
    if (session?.user) await loadUser(session.user)
  }

  const can = (permission: Permission): boolean => {
    if (!user?.profile) return false
    return PERMISSIONS[permission].includes(user.profile.role)
  }

  const role = user?.profile?.role ?? null
  const isSuperadmin = role === 'founder'
  const isManager = role === 'founder' || role === 'admin'
  const isStaff = role !== null
  const canManageUsers = role === 'founder'
  const canImportData = role === 'founder' || role === 'admin'
  const profile = user?.profile ?? null

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signIn, signOut, refreshProfile,
      can, role, isSuperadmin, isManager, isStaff,
      canManageUsers, canImportData, profile,
    }}>
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', fontSize: '14px', color: '#94a3b8',
        }}>
          Memuat sesi...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
