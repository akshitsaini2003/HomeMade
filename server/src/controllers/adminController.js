const dayjs = require('dayjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Setting = require('../models/Setting');
const Coupon = require('../models/Coupon');
const ContactInquiry = require('../models/ContactInquiry');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { creditWallet } = require('../services/walletService');
const { addLoyaltyPoints, deductLoyaltyPoints } = require('../services/loyaltyService');
const { createRefund } = require('../services/paymentService');
const { createBulkNotifications } = require('../services/notificationService');
const { sendEmail } = require('../utils/email');
const { sendTemplatedEmail } = require('../services/emailService');
const { runInBackground } = require('../utils/backgroundTask');

const getReversibleLoyaltyPoints = (order) => {
  if (Number(order.loyaltyPointsCredited || 0) > 0) return Number(order.loyaltyPointsCredited || 0);
  if (order.orderStatus === 'delivered' && env.loyalty.pointsPerOrder > 0) return env.loyalty.pointsPerOrder;
  return 0;
};

const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const search = (req.query.search || '').trim();

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      items: users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

const getUserHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).lean();
  if (!user) throw new ApiError(404, 'User not found');

  const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).lean();

  res.json({ success: true, data: { user, orders } });
});

const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { isBlocked: req.body.isBlocked },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, data: user });
});

const listOrders = asyncHandler(async (req, res) => {
  const filter = {};
  const { date, slot, paymentStatus, orderStatus } = req.query;

  if (date) {
    const d = dayjs(date);
    filter.mealDate = { $gte: d.startOf('day').toDate(), $lte: d.endOf('day').toDate() };
  }
  if (slot) filter.slot = slot;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (orderStatus) filter.orderStatus = orderStatus;

  const orders = await Order.find(filter)
    .select(
      'orderCode dailyOrderNumber userId menuId mealDate slot quantity subtotal addonTotal addonItems '
      + 'discountAmount couponCode couponDiscount totalAmount walletUsed amountPaidOnline paymentMethod '
      + 'paymentStatus orderStatus fulfillmentType cancellationReason cancelledAt createdAt '
      + 'loyaltyPointsRedeemed loyaltyPointsCredited'
    )
    .populate('userId', 'name email phone')
    .populate('menuId', 'items')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: orders });
});

const exportOrdersCsv = asyncHandler(async (req, res) => {
  const date = req.query.date ? dayjs(req.query.date) : dayjs();
  const orders = await Order.find({
    mealDate: { $gte: date.startOf('day').toDate(), $lte: date.endOf('day').toDate() }
  }).populate('userId', 'name email phone');

  const headers = ['OrderCode', 'Customer', 'Email', 'Phone', 'Slot', 'Quantity', 'Amount', 'PaymentStatus', 'OrderStatus'];
  const rows = orders.map((order) => [
    order.orderCode,
    order.userId?.name || '',
    order.userId?.email || '',
    order.userId?.phone || '',
    order.slot,
    order.quantity,
    order.totalAmount,
    order.paymentStatus,
    order.orderStatus
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=orders-${date.format('YYYY-MM-DD')}.csv`);
  res.send(csv);
});

const getDashboard = asyncHandler(async (_req, res) => {
  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();
  const weekStart = dayjs().startOf('week').toDate();
  const monthStart = dayjs().startOf('month').toDate();

  const [
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    completedOrders,
    avgOrderValue,
    topCustomers,
    revenueBySlot
  ] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered', createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered', createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered', createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Order.countDocuments({ orderStatus: 'delivered' }),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered' } },
      { $group: { _id: null, average: { $avg: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered' } },
      { $group: { _id: '$userId', totalSpent: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', email: '$user.email', totalSpent: 1, orders: 1 } }
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered' } },
      { $group: { _id: '$slot', revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      todayRevenue: todayRevenue[0]?.total || 0,
      weeklyRevenue,
      monthlyRevenue,
      totalOrdersCompleted: completedOrders,
      averageOrderValue: Number((avgOrderValue[0]?.average || 0).toFixed(2)),
      topCustomers,
      revenueBySlot
    }
  });
});

const getInventoryInsights = asyncHandler(async (_req, res) => {
  const tomorrow = dayjs().add(1, 'day');

  const [menu, popularItems, demandTrend] = await Promise.all([
    Menu.findOne({ date: { $gte: tomorrow.startOf('day').toDate(), $lte: tomorrow.endOf('day').toDate() } }).lean(),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered' } },
      {
        $lookup: {
          from: 'menus',
          localField: 'menuId',
          foreignField: '_id',
          as: 'menu'
        }
      },
      { $unwind: '$menu' },
      { $unwind: '$menu.items' },
      { $group: { _id: '$menu.items.name', sold: { $sum: '$quantity' } } },
      { $sort: { sold: -1 } },
      { $limit: 8 }
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', orderStatus: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$mealDate' } },
          plates: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ])
  ]);

  res.json({
    success: true,
    data: {
      tomorrow: menu
        ? {
            totalPlates: menu.totalPlates,
            remainingPlates: menu.remainingPlates,
            soldPlates: menu.totalPlates - menu.remainingPlates
          }
        : null,
      popularItems,
      demandTrend
    }
  });
});

const getRefundRequests = asyncHandler(async (_req, res) => {
  const orders = await Order.find({ refundStatus: 'requested' })
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: orders });
});

const decideRefund = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { approve, method = 'wallet', reason = '' } = req.body;

  const order = await Order.findById(orderId).populate('userId');
  if (!order) throw new ApiError(404, 'Order not found');

  if (!approve) {
    order.refundStatus = 'rejected';
    order.notes = reason || 'Refund rejected by admin';
    await order.save();
    return res.json({ success: true, message: 'Refund rejected', data: order });
  }

  if (method === 'source') {
    if (!order.paymentId) {
      throw new ApiError(400, 'Payment ID missing for source refund');
    }

    await createRefund({ paymentId: order.paymentId, amount: order.totalAmount });

    const reversiblePoints = getReversibleLoyaltyPoints(order);
    if (reversiblePoints > 0) {
      await deductLoyaltyPoints({
        userId: order.userId._id,
        points: reversiblePoints,
        orderId: order._id,
        meta: { reason: 'refund-approved-by-admin', method: 'source' }
      });
      order.loyaltyPointsCredited = 0;
    }

    order.paymentStatus = 'refunded';
    order.refundMethod = 'source';
    order.refundStatus = 'processed';
    await order.save();
  } else {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const freshOrder = await Order.findById(orderId).session(session);
        if (!freshOrder) throw new ApiError(404, 'Order not found');

        await creditWallet({
          userId: freshOrder.userId,
          amount: freshOrder.totalAmount,
          reason: 'refund',
          orderId: freshOrder._id,
          session,
          meta: { adminApproved: true }
        });

        const reversiblePoints = getReversibleLoyaltyPoints(freshOrder);
        if (reversiblePoints > 0) {
          await deductLoyaltyPoints({
            userId: freshOrder.userId,
            points: reversiblePoints,
            orderId: freshOrder._id,
            session,
            meta: { reason: 'refund-approved-by-admin', method: 'wallet' }
          });
          freshOrder.loyaltyPointsCredited = 0;
        }

        freshOrder.paymentStatus = 'refunded';
        freshOrder.refundMethod = 'wallet';
        freshOrder.refundStatus = 'processed';
        await freshOrder.save({ session });
      });
    } finally {
      await session.endSession();
    }
  }

  runInBackground('admin-refund-notify', async () => {
    await Promise.allSettled([
      sendTemplatedEmail('refundConfirmation', order.userId.email, {
        name: order.userId.name,
        amount: order.totalAmount
      }),
      Notification.create({
        userId: order.userId._id,
        title: 'Refund processed',
        message: `Refund for order ${order.orderCode} has been processed.`,
        type: 'payment',
        meta: { orderId: order._id }
      })
    ]);
  });

  res.json({ success: true, message: 'Refund processed' });
});

const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Setting.findOne().lean();
  res.json({ success: true, data: settings || {} });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });

  res.json({ success: true, message: 'Settings updated', data: settings });
});

const sendBulkAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, channel = 'both' } = req.body;
  const users = await User.find({ role: 'user', isBlocked: false }).select('_id email name');

  if (channel === 'inapp' || channel === 'both') {
    await createBulkNotifications({
      userIds: users.map((u) => u._id),
      title,
      message,
      type: 'system'
    });
  }

  if (channel === 'email' || channel === 'both') {
    await Promise.all(
      users.map((user) =>
        sendEmail({
          to: user.email,
          subject: title,
          html: `<p>Hi ${user.name},</p><p>${message}</p>`
        })
      )
    );
  }

  res.json({ success: true, message: `Announcement sent to ${users.length} users` });
});

const creditUserLoyalty = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const points = Number(req.body.points || 0);
  const reason = String(req.body.reason || '').trim();

  if (points <= 0) {
    throw new ApiError(400, 'Loyalty points must be greater than 0');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await addLoyaltyPoints({
    userId: user._id,
    points,
    meta: {
      manualCredit: true,
      creditedBy: req.user._id,
      reason: reason || 'Admin loyalty credit'
    }
  });

  runInBackground('admin-loyalty-credit-notify', async () => {
    await createBulkNotifications({
      userIds: [user._id],
      title: 'Loyalty points credited',
      message: `${points} loyalty points added by admin${reason ? ` (${reason})` : ''}.`,
      type: 'system'
    });
  });

  res.json({ success: true, message: 'Loyalty points credited successfully' });
});

const parseCouponPayload = (payload, { partial = false } = {}) => {
  const parsed = {};

  if (!partial || payload.code !== undefined) parsed.code = String(payload.code || '').trim().toUpperCase();
  if (!partial || payload.title !== undefined) parsed.title = String(payload.title || '').trim();
  if (!partial || payload.description !== undefined) parsed.description = String(payload.description || '').trim();
  if (!partial || payload.discountPercent !== undefined) parsed.discountPercent = Number(payload.discountPercent);
  if (!partial || payload.maxDiscountAmount !== undefined) parsed.maxDiscountAmount = Number(payload.maxDiscountAmount);
  if (!partial || payload.minOrderAmount !== undefined) parsed.minOrderAmount = Number(payload.minOrderAmount || 0);
  if (!partial || payload.isActive !== undefined) {
    parsed.isActive = payload.isActive !== false && String(payload.isActive) !== 'false';
  }
  if (!partial || payload.validFrom !== undefined) {
    parsed.validFrom = payload.validFrom ? new Date(payload.validFrom) : null;
    if (parsed.validFrom && Number.isNaN(parsed.validFrom.getTime())) parsed.validFrom = null;
  }
  if (!partial || payload.validTo !== undefined) {
    parsed.validTo = payload.validTo ? new Date(payload.validTo) : null;
    if (parsed.validTo && Number.isNaN(parsed.validTo.getTime())) parsed.validTo = null;
  }

  return parsed;
};

const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: coupons });
});

const createCoupon = asyncHandler(async (req, res) => {
  const payload = parseCouponPayload(req.body, { partial: false });
  if (payload.validFrom && payload.validTo && payload.validTo < payload.validFrom) {
    throw new ApiError(400, 'Coupon validTo must be after validFrom');
  }

  try {
    const coupon = await Coupon.create(payload);
    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Coupon code already exists');
    }
    throw error;
  }
});

const updateCoupon = asyncHandler(async (req, res) => {
  const payload = parseCouponPayload(req.body, { partial: true });
  if (payload.code === '') delete payload.code;
  if (payload.validFrom && payload.validTo && payload.validTo < payload.validFrom) {
    throw new ApiError(400, 'Coupon validTo must be after validFrom');
  }

  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, payload, { new: true, runValidators: true });
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    res.json({ success: true, message: 'Coupon updated', data: coupon });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Coupon code already exists');
    }
    throw error;
  }
});

const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  res.json({ success: true, message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`, data: coupon });
});

const dailySummary = asyncHandler(async (req, res) => {
  const date = dayjs(req.query.date || new Date());

  const orders = await Order.find({
    mealDate: { $gte: date.startOf('day').toDate(), $lte: date.endOf('day').toDate() }
  })
    .populate('userId', 'name phone')
    .sort({ slot: 1, createdAt: 1 })
    .lean();

  const summary = {
    date: date.format('YYYY-MM-DD'),
    totalOrders: orders.length,
    totalPlates: orders.reduce((acc, o) => acc + o.quantity, 0),
    slots: {
      lunch: orders.filter((o) => o.slot === 'lunch'),
      dinner: orders.filter((o) => o.slot === 'dinner')
    }
  };

  res.json({ success: true, data: summary });
});

const listContactInquiries = asyncHandler(async (_req, res) => {
  const inquiries = await ContactInquiry.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: inquiries });
});

module.exports = {
  listUsers,
  getUserHistory,
  blockUser,
  listOrders,
  exportOrdersCsv,
  getDashboard,
  getInventoryInsights,
  getRefundRequests,
  decideRefund,
  getSettings,
  updateSettings,
  sendBulkAnnouncement,
  creditUserLoyalty,
  listCoupons,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  dailySummary,
  listContactInquiries
};
