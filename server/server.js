import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import certRoutes from "./routes/certificates.js";
import studentRoutes from "./routes/students.js";
import createAdmin from "./utils/createAdmin.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

const DEFAULT_CORS_ORIGINS =
  "http://localhost:5173,https://verifydespro.online";
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || DEFAULT_CORS_ORIGINS)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all during transition
    },
    credentials: true,
  })
);
app.options("*", cors());

// Serve static assets
const clientDistPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(clientDistPath));

app.use(
  "/certificates",
  express.static(path.join(__dirname, "public", "certificates"))
);
app.use(
  "/templates",
  express.static(path.join(__dirname, "public", "templates"))
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/certificates", certRoutes);

// Catch-all to serve React app
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ message: "API not found" });
  const indexPath = path.join(clientDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: "API running (Frontend not built)" });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

async function start() {
  try {
    // Initial data setup
    await createAdmin();
    
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`🚀 Unified Server listening on port ${port}`));
  } catch (err) {
    console.error("Failed to start server:", err);
  }
}
start();
