import { useAuth } from '../contexts/AuthContext'

export function useRole() {
  const { user, profile, loading, signOut } = useAuth()

  const role = profile?.role ?? null
  const isSuperadmin = role === 'founder'
  const isManager = role === 'founder' || role === 'admin'
  const isStaff = !!user

  return {
    role,
    isSuperadmin,
    isManager,
    isStaff,
    canManageUsers: isSuperadmin,
    canImportData: isManager,
    profile,
    user,
    loading,
    signOut,
    showFor: (roles: string[]) => role !== null && roles.includes(role),
  }
}
