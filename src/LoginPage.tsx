import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleEmailAuth = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Email dan password wajib diisi')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Cek email kamu untuk konfirmasi akun!')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f3',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.08)',
        padding: '40px', width: '100%', maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: 500, color: '#1a1a1a' }}>
            Ads<span style={{ color: '#185FA5' }}>Dash</span>
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Omnichannel Ads Dashboard</div>
        </div>

        {/* Toggle login/register */}
        <div style={{ display: 'flex', background: '#f5f5f3', borderRadius: '8px', padding: '4px', marginBottom: '24px' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#1a1a1a' : '#888',
                fontSize: '12px', fontWeight: mode === m ? 500 : 400,
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {m === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        {/* Google Button */}
        <button onClick={handleGoogle} disabled={loading}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px',
            border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontSize: '13px', cursor: 'pointer', marginBottom: '16px', fontWeight: 500,
            color: '#1a1a1a',
          }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Lanjutkan dengan Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ fontSize: '11px', color: '#888' }}>atau</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Email & Password */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#555', display: 'block', marginBottom: '4px' }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="nama@email.com"
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '8px', outline: 'none', color: '#1a1a1a' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#555', display: 'block', marginBottom: '4px' }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '8px', outline: 'none', color: '#1a1a1a' }}
          />
        </div>

        {/* Error & Success */}
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: '12px', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#EAF3DE', color: '#27500A', fontSize: '12px', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleEmailAuth} disabled={loading}
          style={{
            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
            background: '#185FA5', color: '#fff', fontSize: '13px', fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
          {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#888' }}>
          Dengan masuk, kamu menyetujui syarat penggunaan AdsDash
        </div>
      </div>
    </div>
  )
}