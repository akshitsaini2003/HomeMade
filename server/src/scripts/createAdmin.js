const dayjs = require('dayjs');
const connectDB = require('../config/db');
const env = require('../config/env');
const User = require('../models/User');

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email: env.adminEmail });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: env.adminName,
    email: env.adminEmail,
    phone: env.adminPhone,
    password: env.adminPassword,
    role: 'admin',
    isVerified: true
  });

  console.log('Admin created:', {
    email: admin.email,
    password: env.adminPassword,
    createdAt: dayjs(admin.createdAt).format('YYYY-MM-DD HH:mm:ss')
  });

  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
