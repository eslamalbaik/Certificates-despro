
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const resetAdmin = async () => {
    console.log('--- RESET ADMIN PASSWORD START ---');

    if (!process.env.MONGODB_URI) {
        console.error('CRITICAL: MONGODB_URI is missing!');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }

    const targetUsername = process.env.ADMIN_USERNAME || 'admin';
    const targetPassword = process.env.ADMIN_PASSWORD;

    if (!targetPassword) {
        console.error('❌ ADMIN_PASSWORD missing from .env');
        process.exit(1);
    }

    console.log(`Target User: ${targetUsername}`);
    console.log(`Target Password: ${targetPassword}`);

    try {
        let admin = await Admin.findOne({ username: targetUsername });

        const hashedPassword = await bcrypt.hash(targetPassword, 10);

        if (!admin) {
            console.log(`User "${targetUsername}" not found. Creating new admin...`);
            admin = new Admin({
                username: targetUsername,
                password: hashedPassword
            });
        } else {
            console.log(`User "${targetUsername}" found. Updating password...`);
            admin.password = hashedPassword;
        }

        await admin.save();
        console.log('✅ Admin password has been successfully reset/created.');
        console.log('You should now be able to login with these credentials.');

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await mongoose.connection.close();
        console.log('--- RESET ADMIN PASSWORD END ---');
        process.exit(0);
    }
};

resetAdmin();
