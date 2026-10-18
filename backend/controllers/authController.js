import { registerUser, loginUser } from "../services/authService.js"
import supabase from "../config/supabaseClient.js"
import supabaseAdmin from "../config/supabaseAdmin.js"

const AUTHORITY_SECURITY_CODE = process.env.AUTHORITY_SECURITY_CODE || "AUTHORITY"

export const register = async (req, res) => {
  const {
    email,
    password,
    name,
    contact,
    ward_no,
    role,
    security_code,
    securityCode,
  } = req.body

  const normalizedRole = (role || "citizen").toLowerCase()

  if (!["citizen", "authority"].includes(normalizedRole)) {
    return res.status(400).json({ error: "Invalid role. Use citizen or authority." })
  }

  if (normalizedRole === "authority") {
    const providedCode = security_code || securityCode

    if (!providedCode || providedCode !== AUTHORITY_SECURITY_CODE) {
      return res.status(403).json({ error: "Invalid authority security code" })
    }
  }

  const { data, error } = await registerUser(email, password)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const user = data.user

// await supabaseAdmin.from("users").insert([
//   {
//     id: user.id,
//     email,
//     name,
//     contact,
//     ward_no,
//     role: "citizen",
//   },
// ])

  const { error: dbError } = await supabase.from("users").insert([
    {
      id: user.id,
      email,
      name,
      contact,
      ward_no,
      role: normalizedRole,
    },
  ])

  if (dbError) {
    return res.status(500).json({ error: dbError.message })
  }

  res.json({ message: "User registered successfully", user })
}

export const login = async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await loginUser(email, password)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  res.json(data)
}

// GET /api/auth/me — returns the full DB user profile (role, ward_no, etc.)
export const getMe = async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, contact, ward_no, role')
      .eq('id', req.user.id)
      .single()

    if (error) return res.status(404).json({ error: 'User profile not found' })

    res.json({ success: true, user: profile })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}