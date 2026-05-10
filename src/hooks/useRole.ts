// src/hooks/useRole.ts
// Gunakan hook ini di komponen manapun untuk cek permission
// 
// Contoh:
//   const { canManageUsers, isSuperadmin } = useRole()
//   if (!canManageUsers) return null
//
import { useAuth } from '../contexts/AuthContext'

export function useRole() {
  const {
    role,
    isSuperadmin,
    isManager,
    isStaff,
    canManageUsers,
    canImportData,
    profile,
  } = useAuth()

  return {
    role,
    isSuperadmin,
    isManager,        // true juga untuk superadmin
    isStaff,          // true untuk semua yang sudah login
    canManageUsers,   // hanya superadmin
    canImportData,    // superadmin + manager
    profile,

    // Helper: tampilkan elemen hanya untuk role tertentu
    // Contoh: <>{showFor(['superadmin', 'manager']) && <ImportButton />}</>
    showFor: (roles: Array<'superadmin' | 'manager' | 'staff'>) => {
      return role !== null && roles.includes(role)
    },
  }
}
