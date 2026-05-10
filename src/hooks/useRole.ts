// src/hooks/useRole.ts
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'

export function useRole() {
  const {
    role, isSuperadmin, isManager, isStaff,
    canManageUsers, canImportData, profile,
  } = useAuth()

  return {
    role,
    isSuperadmin,  // founder
    isManager,     // founder + admin
    isStaff,       // semua yang login
    canManageUsers,
    canImportData,
    profile,
    showFor: (roles: UserRole[]) => role !== null && roles.includes(role),
  }
}
