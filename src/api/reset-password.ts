import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, new_password } = req.body

  if (!user_id || !new_password) {
    return res.status(400).json({ error: 'user_id dan new_password wajib diisi' })
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    })

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
