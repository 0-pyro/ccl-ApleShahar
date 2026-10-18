import express from "express"
import { fetchTestData } from "../controllers/testController.js"
import { protect } from "../middleware/authMiddleware.js"
import { authorize } from "../middleware/roleMiddleware.js"

const router = express.Router()

router.get("/all", protect, fetchTestData)

router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Admin data visible" })
})

router.get("/manage", protect, authorize("admin", "authorities"), (req, res) => {
  res.json({ message: "Management access" })
})

export default router