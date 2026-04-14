
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Admin from './models/Admin.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const runDebug = async () => {
  console.log('--- START DEBUG LOGIN ANALYSIS ---');
  
  // 1. Check ENV
  console.log('ENV ADMIN_USERNAME:', `"${process.env.ADMIN_USERNAME}"`);
  console.log('ENV ADMIN_PASSWORD:', `"${process.env.ADMIN_PASSWORD}"`);
  console.log('ENV MONGODB_URI:', process.env.MONGODB_URI ? 'Exists' : 'MISSING');

  if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is missing!');
    process.exit(1);
  }

  // 2. Connect DB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }

  // 3. Find Admin
  const targetUsername = process.env.ADMIN_USERNAME || 'admin';
  console.log(`Searching for admin user: "${targetUsername}"...`);

  const admin = await Admin.findOne({ username: targetUsername });
  
  if (!admin) {
    console.error(`❌ User "${targetUsername}" NOT FOUND in DB.`);
    console.log('Listing ALL admins in DB:');
    const allAdmins = await Admin.find({});
    console.log(JSON.stringify(allAdmins, null, 2));
  } else {
    console.log(`✅ User "${targetUsername}" FOUND.`);
    console.log('Stored Hash:', admin.password);
    
    // 4. Test Password
    const targetPassword = process.env.ADMIN_PASSWORD;
    if (!targetPassword) {
        console.error('❌ No ADMIN_PASSWORD in .env to test against.');
    } else {
        console.log(`Testing password: "${targetPassword}" against stored hash...`);
        const match = await bcrypt.compare(targetPassword, admin.password);
        console.log(`Bcrypt Compare Result: ${match}`);
        
        if (match) {
            console.log('✅ Password matches! Login SHOULD work.');
        } else {
            console.error('❌ Password DOES NOT match.');
            
            // Generate what the hash SHOULD be
            const newHash = await bcrypt.hash(targetPassword, 10);
            console.log('If you were to hash the current .env password, it would look like:', newHash);
            
            // Suggest Fix
            console.log('--> To fix, you might need to update the DB with this new hash.');
        }
    }
  }

  console.log('--- END DEBUG LOGIN ANALYSIS ---');
  process.exit(0);
};

runDebug();
