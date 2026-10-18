import supabase from "../config/supabaseClient.js"
import supabaseAdmin from "../config/supabaseAdmin.js"


export const registerUser = async (email, password) => {
  return await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
}

export const loginUser = async (email, password) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}