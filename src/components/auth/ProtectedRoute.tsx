// src/components/auth/ProtectedRoute.tsx
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f5f5f3',
      }}>
        <div style={{ fontSize: '14px', color: '#888' }}>Memuat...</div>
      </div>
    )
  }

  if (!user) return null

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f5f5f3',
      }}>
        <div style={{ fontSize: '14px', color: '#e53935' }}>Akses ditolak.</div>
      </div>
    )
  }

  return <>{children}</>
}
