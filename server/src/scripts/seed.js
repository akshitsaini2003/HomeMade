const dayjs = require('dayjs');
const connectDB = require('../config/db');
const env = require('../config/env');
const User = require('../models/User');
const Menu = require('../models/Menu');
const Setting = require('../models/Setting');

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({ email: { $in: ['student1@example.com', 'student2@example.com', env.adminEmail] } }),
    Menu.deleteMany({}),
    Setting.deleteMany({})
  ]);

  const admin = await User.create({
    name: env.adminName,
    email: env.adminEmail,
    phone: env.adminPhone,
    password: env.adminPassword,
    role: 'admin',
    isVerified: true
  });

  await User.insertMany([
    {
      name: 'Aman Verma',
      email: 'student1@example.com',
      phone: '9876543210',
      password: 'Student@123',
      role: 'user',
      isVerified: true,
      walletBalance: 250,
      loyaltyPoints: 120
    },
    {
      name: 'Riya Singh',
      email: 'student2@example.com',
      phone: '9898989898',
      password: 'Student@123',
      role: 'user',
      isVerified: true,
      walletBalance: 100,
      loyaltyPoints: 30
    }
  ]);

  const tomorrow = dayjs().add(1, 'day').startOf('day');
  await Menu.create({
    date: tomorrow.toDate(),
    items: [
      {
        name: 'Rajma Chawal Combo',
        description: 'Slow-cooked rajma with jeera rice, salad, and papad',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Chapati + Mix Veg + Dal',
        description: '4 chapatis, seasonal dry sabzi, yellow dal fry',
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
      }
    ],
    addons: [
      {
        name: 'Curd Cup',
        description: 'Fresh curd 100ml',
        price: 25,
        image: 'https://images.unsplash.com/photo-1604908177522-4294f2f1d9b4?auto=format&fit=crop&w=900&q=80',
        isActive: true
      },
      {
        name: 'Cold Drink',
        description: '300ml chilled beverage',
        price: 35,
        image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80',
        isActive: true
      }
    ],
    platePrice: 129,
    totalPlates: 80,
    remainingPlates: 80,
    cutoffTime: dayjs().hour(env.defaultCutoffHour).minute(0).second(0).millisecond(0).toDate(),
    slots: ['lunch', 'dinner'],
    slotAvailability: [
      { slot: 'lunch', totalPlates: 40, remainingPlates: 40 },
      { slot: 'dinner', totalPlates: 40, remainingPlates: 40 }
    ],
    isActive: true
  });

  await Setting.create({
    businessName: env.business.name,
    address: env.business.address,
    contact: env.business.contact,
    deliveryCharges: 0,
    loyaltyPointsPerOrder: env.loyalty.pointsPerOrder,
    loyaltyRedeemPoints: env.loyalty.redeemPoints,
    loyaltyRedeemValue: env.loyalty.redeemValue
  });

  console.log('Seed completed');
  console.log('Admin credentials:', env.adminEmail, env.adminPassword);
  console.log('User credentials: student1@example.com / Student@123');
  console.log('User credentials: student2@example.com / Student@123');

  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
