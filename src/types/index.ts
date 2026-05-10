// src/types/index.ts
// Role system: founder = superadmin, admin = manager, client = staff
export type UserRole = 'founder' | 'admin' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  client_id: string | null
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
}

export type Permission =
  | 'manage_users'
  | 'import_data'
  | 'view_all_clients'
  | 'view_settings'

export const PERMISSIONS: Record<Permission, UserRole[]> = {
  manage_users:     ['founder'],
  import_data:      ['founder', 'admin'],
  view_all_clients: ['founder', 'admin'],
  view_settings:    ['founder', 'admin'],
}
