import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, AuthUser, Permission } from '../types'
import { PERMISSIONS } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  can: (permission: Permission) => boolean
  isSuperadmin: boolean
  isManager: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (authUser: User): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    if (error) { console.error('Error fetching profile:', error); return null }
    return data as Profile
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
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const refreshProfile = async () => {
    if (session?.user) await loadUser(session.user)
  }

  const can = (permission: Permission): boolean => {
    if (!user?.profile) return false
    return PERMISSIONS[permission].includes(user.profile.role)
  }

  const role = user?.profile?.role
  const isSuperadmin = role === 'superadmin'
  const isManager = role === 'manager'
  const isStaff = role === 'staff'

  return (
    <AuthContext.Provider value={{
      user, session, loading, signIn, signOut, refreshProfile,
      can, isSuperadmin, isManager, isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
