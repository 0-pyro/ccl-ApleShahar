import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import testRoutes from "./routes/testRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import complaintsRoutes from "./routes/complaintsRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import { initDb } from "./config/db.js";
import { loadSecrets } from "./config/secrets.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[\w.-]+(\.vercel\.app)$/.test(origin)) return true;
  // Allow AWS CloudFront or EC2 origins
  if (/^https?:\/\/[\w.-]+(\.cloudfront\.net|\.amazonaws\.com)$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(/.*/, cors());
app.use(express.json());

// Serve local uploads folder statically for local dev fallback
app.use("/uploads", express.static(path.resolve("uploads")));

// Cloud Healthcheck (for AWS CloudWatch, ALB, or EC2 status check)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ApleShahar-Backend",
    timestamp: new Date().toISOString(),
  });
});

// Application Routes
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/facility", facilityRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Asynchronously load production secrets from AWS SSM Parameter Store if available
  await loadSecrets();
  // Run schema auto-migration on launch
  await initDb();
});