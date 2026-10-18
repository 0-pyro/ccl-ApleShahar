import { getTestData } from "../services/testService.js"

export const fetchTestData = async (req, res) => {
  const { data, error } = await getTestData()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
}