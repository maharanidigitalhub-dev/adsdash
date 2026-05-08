import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, full_name, role, client_ids } = req.body

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, dan role wajib diisi' })
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Gagal membuat user' })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: authData.user.id, email, full_name, role, client_id: null })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({ error: profileError.message })
    }

    // Insert ke user_clients jika ada client_ids
    if (client_ids && client_ids.length > 0) {
      await supabaseAdmin.from('user_clients').insert(
        client_ids.map((cid: string) => ({ user_id: authData.user.id, client_id: cid }))
      )
    }

    return res.status(200).json({ success: true, user_id: authData.user.id })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}