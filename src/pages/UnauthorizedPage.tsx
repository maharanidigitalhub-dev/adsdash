// src/pages/UnauthorizedPage.tsx
import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
        <p className="text-gray-500 text-sm mb-6">
          Kamu tidak memiliki izin untuk mengakses halaman ini. Hubungi administrator jika butuh akses.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Kembali
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            Ganti Akun
          </button>
        </div>
      </div>
    </div>
  )
}
