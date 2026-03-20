const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminName: process.env.ADMIN_NAME || 'Admin',
  adminPhone: process.env.ADMIN_PHONE || '9999999999',
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'HomeMade <no-reply@homemade.app>'
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  loyalty: {
    pointsPerOrder: Number(process.env.LOYALTY_POINTS_PER_ORDER || 10),
    redeemPoints: Number(process.env.LOYALTY_REDEEM_POINTS || 100),
    redeemValue: Number(process.env.LOYALTY_REDEEM_VALUE || 50)
  },
  deliveredOrderCredit: Number(process.env.DELIVERED_ORDER_CREDIT || 0),
  business: {
    name: process.env.BUSINESS_NAME || 'HomeMade',
    address: process.env.BUSINESS_ADDRESS || 'Campus Area',
    contact: process.env.BUSINESS_CONTACT || '+91-9999999999'
  },
  defaultCutoffHour: Number(process.env.DEFAULT_CUTOFF_HOUR || 22)
};
