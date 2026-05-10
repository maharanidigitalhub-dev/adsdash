// src/pages/UnauthorizedPage.tsx
import { useAuth } from '../contexts/AuthContext'

export function UnauthorizedPage() {
  const { signOut } = useAuth()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f3', padding: '16px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: '#FCEBEB', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
          fontSize: '28px',
        }}>
          🚫
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Akses Ditolak
        </h1>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>
          Kamu tidak memiliki izin untuk mengakses halaman ini.
          Hubungi administrator jika butuh akses.
        </p>
        <button
          onClick={signOut}
          style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none',
            background: '#185FA5', color: '#fff', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          Ganti Akun
        </button>
      </div>
    </div>
  )
}
