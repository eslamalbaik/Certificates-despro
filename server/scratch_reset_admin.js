import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAdmin() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error("❌ Missing ADMIN_USERNAME or ADMIN_PASSWORD in .env");
    return;
  }

  console.log(`🔄 Resetting admin [${ADMIN_USERNAME}]...`);

  const adminsPath = path.join(__dirname, "data", "admins.json");
  
  // Ensure data directory exists
  if (!fs.existsSync(path.join(__dirname, "data"))) {
    fs.mkdirSync(path.join(__dirname, "data"));
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  
  // Directly write to admins.json to ensure it's reset
  const adminData = [{
    id: "admin-reset-id",
    _id: "admin-reset-id",
    username: ADMIN_USERNAME,
    password: hashed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }];

  fs.writeFileSync(adminsPath, JSON.stringify(adminData, null, 2));
  console.log("✅ Admin password has been reset to match .env");
}

resetAdmin();
