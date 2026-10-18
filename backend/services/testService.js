import supabase from "../config/supabaseClient.js"

export const getTestData = async () => {
  return await supabase.from("test").select("*")
}