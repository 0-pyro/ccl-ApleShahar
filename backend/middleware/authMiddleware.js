import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import supabaseAdmin from "../config/supabaseAdmin.js"

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" })
    }

    req.user = data.user
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single()

    req.userRole = userData?.role

    next()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}