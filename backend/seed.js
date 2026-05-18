/**
 * Run this script ONCE to create the first admin account.
 * Usage: node seed.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Check if admin already exists
    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log(`⚠️  Admin already exists: ${existing.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Village Admin',
      email: process.env.ADMIN_EMAIL || 'admin@smartvillage.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
      village: 'Headquarters',
    });

    console.log(`✅ Admin created successfully!`);
    console.log(`   Email   : ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    console.log(`   Role    : ${admin.role}`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
