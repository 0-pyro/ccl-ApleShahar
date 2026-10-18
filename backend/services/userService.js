import supabase from "../config/supabaseClient.js"

export const createUserProfile = async (user) => {
  return await supabase.from("users").insert([
    {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "",
      role: "citizen",
    },
  ])
}