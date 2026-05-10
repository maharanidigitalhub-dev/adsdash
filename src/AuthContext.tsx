import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'founder' | 'admin' | 'client'
  client_id: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error && data) return data as Profile
    } catch {}
    return null
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (mounted) setProfile(p)
      }

      if (mounted) setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          const p = await fetchProfile(session.user.id)
          if (mounted) {
            setProfile(p)
            setLoading(false)
          }
        } else {
          setUser(null)
          setProfile(null)
          if (mounted) setLoading(false)
        }
      }
    )

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signOut = async () => {
    try {
      // Panggil signOut ke Supabase — ini trigger onAuthStateChange
      // yang akan set user & profile ke null otomatis
      await supabase.auth.signOut({ scope: 'global' })
    } catch (err) {
      // Kalau request gagal (misal offline), tetap bersihkan state lokal
      console.warn('signOut error (handled):', err)
      setUser(null)
      setProfile(null)
    }
    // Bersihkan hanya storage key Supabase, jangan localStorage.clear()
    // karena itu bisa hapus data lain yang tidak berhubungan
    localStorage.removeItem('adsdash-auth-v2')
    sessionStorage.removeItem('adsdash-auth-v2')
    // TIDAK pakai window.location.href = '/login'
    // karena app ini SPA tanpa route /login — onAuthStateChange sudah
    // menangani redirect ke LoginPage via kondisi !user di App.tsx
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontSize: '14px',
            color: '#94a3b8',
          }}
        >
          Memuat sesi...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
