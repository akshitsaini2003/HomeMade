const mongoose = require('mongoose');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const DailyOrderCounter = require('../models/DailyOrderCounter');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { createRazorpayOrder } = require('../services/paymentService');
const { creditWallet, debitWallet } = require('../services/walletService');
const { addLoyaltyPoints, deductLoyaltyPoints } = require('../services/loyaltyService');
const { sendTemplatedEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { generateInvoiceBuffer } = require('../utils/invoice');
const { runInBackground } = require('../utils/backgroundTask');

const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};
const PENDING_PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;
const PENDING_PAYMENT_SWEEP_INTERVAL_MS = 60 * 1000;

let pendingPaymentSweepInterval = null;
let pendingPaymentSweepRunning = false;

const createOrderCode = () => `HM${dayjs().format('YYMMDD')}${uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
const createDateKey = (date) => dayjs(date).format('YYYY-MM-DD');

const parseAddonSelections = (rawValue) => {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return [];
  }
};

const parseCouponCode = (rawCode) => String(rawCode || '').trim().toUpperCase();
const getReversibleLoyaltyPoints = (order) => {
  if (Number(order.loyaltyPointsCredited || 0) > 0) return Number(order.loyaltyPointsCredited || 0);
  if (order.orderStatus === 'delivered' && env.loyalty.pointsPerOrder > 0) return env.loyalty.pointsPerOrder;
  return 0;
};

const getNextDailyOrderNumber = async ({ mealDate, session }) => {
  const dateKey = createDateKey(mealDate);
  const counter = await DailyOrderCounter.findOneAndUpdate(
    { dateKey },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );
  return counter.sequence;
};

const resolveCouponDiscount = async ({ couponCode, subtotal }) => {
  const normalizedCode = parseCouponCode(couponCode);
  if (!normalizedCode) {
    return {
      coupon: null,
      couponCode: null,
      couponDiscount: 0
    };
  }

  const now = new Date();
  const coupon = await Coupon.findOne({
    code: normalizedCode,
    isActive: true,
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: null }, { validTo: { $gte: now } }] }
    ]
  }).lean();

  if (!coupon) {
    throw new ApiError(400, 'Coupon is invalid or expired');
  }

  if (subtotal < Number(coupon.minOrderAmount || 0)) {
    throw new ApiError(400, `Coupon requires minimum order of INR ${Number(coupon.minOrderAmount || 0).toFixed(2)}`);
  }

  const percentageDiscount = (subtotal * Number(coupon.discountPercent || 0)) / 100;
  const cappedDiscount = Math.min(percentageDiscount, Number(coupon.maxDiscountAmount || 0));
  const couponDiscount = Number(Math.max(cappedDiscount, 0).toFixed(2));

  return {
    coupon,
    couponCode: coupon.code,
    couponDiscount
  };
};

const ensureBookingOpen = (menu) => {
  if (!menu.isActive) {
    throw new ApiError(400, 'Menu is inactive');
  }

  if (dayjs().isAfter(dayjs(menu.cutoffTime))) {
    throw new ApiError(400, 'Booking cutoff time has passed');
  }
};

const reservePlates = async ({ menuId, slot, quantity, session }) => {
  const updatedMenu = await Menu.findOneAndUpdate(
    {
      _id: menuId,
      remainingPlates: { $gte: quantity },
      slotAvailability: {
        $elemMatch: { slot, remainingPlates: { $gte: quantity } }
      }
    },
    {
      $inc: {
        remainingPlates: -quantity,
        'slotAvailability.$.remainingPlates': -quantity
      }
    },
    { new: true, session }
  );

  if (!updatedMenu) {
    throw new ApiError(409, 'Not enough plates available for selected slot');
  }

  return updatedMenu;
};

const releasePlates = async ({ menuId, slot, quantity, session }) => {
  const updatedMenu = await Menu.findOneAndUpdate(
    { _id: menuId, 'slotAvailability.slot': slot },
    {
      $inc: {
        remainingPlates: quantity,
        'slotAvailability.$.remainingPlates': quantity
      }
    },
    { new: true, session }
  );

  if (!updatedMenu) {
    throw new ApiError(404, 'Menu not found while releasing plates');
  }

  return updatedMenu;
};

const buildAddonItems = ({ menuAddons = [], addonSelections = [] }) => {
  if (!addonSelections.length) {
    return { addonItems: [], addonTotal: 0 };
  }

  const addonMap = new Map(
    menuAddons
      .filter((addon) => addon.isActive !== false)
      .map((addon) => [String(addon._id), addon])
  );

  const addonItems = [];
  let addonTotal = 0;

  addonSelections.forEach((selection) => {
    const addonId = String(selection.addonId || '');
    const quantity = Number(selection.quantity || 0);

    if (!addonId || quantity <= 0) return;

    const addon = addonMap.get(addonId);
    if (!addon) {
      throw new ApiError(400, `Add-on is invalid or inactive: ${addonId}`);
    }

    const price = Number(addon.price);
    const total = Number((price * quantity).toFixed(2));

    addonItems.push({
      addonId: addon._id,
      name: addon.name,
      price,
      quantity,
      total
    });

    addonTotal += total;
  });

  return {
    addonItems,
    addonTotal: Number(addonTotal.toFixed(2))
  };
};

const createOrder = asyncHandler(async (req, res) => {
  const {
    menuId,
    slot,
    quantity,
    walletUse = 0,
    useLoyalty = false,
    fulfillmentType = 'pickup',
    couponCode = '',
    addonSelections = []
  } = req.body;

  const parsedAddonSelections = parseAddonSelections(addonSelections);

  const session = await mongoose.startSession();
  let responsePayload = null;

  try {
    await session.withTransaction(async () => {
      const [menu, user] = await Promise.all([
        Menu.findById(menuId).session(session),
        User.findById(req.user._id).session(session)
      ]);

      if (!menu) {
        throw new ApiError(404, 'Menu not found');
      }

      ensureBookingOpen(menu);

      if (!menu.slots.includes(slot)) {
        throw new ApiError(400, 'Selected slot is unavailable');
      }

      await reservePlates({ menuId: menu._id, slot, quantity: Number(quantity), session });

      const { addonItems, addonTotal } = buildAddonItems({
        menuAddons: menu.addons || [],
        addonSelections: parsedAddonSelections
      });

      const thaliTotal = Number(menu.platePrice) * Number(quantity);
      const subtotal = Number((thaliTotal + addonTotal).toFixed(2));
      const { couponCode: appliedCouponCode, couponDiscount } = await resolveCouponDiscount({
        couponCode,
        subtotal
      });
      let loyaltyDiscount = 0;
      let loyaltyPointsRedeemed = 0;

      if (useLoyalty && user.loyaltyPoints >= env.loyalty.redeemPoints) {
        loyaltyDiscount += env.loyalty.redeemValue;
        loyaltyPointsRedeemed = env.loyalty.redeemPoints;
        user.loyaltyPoints -= loyaltyPointsRedeemed;
      }

      const discountAmount = Number((couponDiscount + loyaltyDiscount).toFixed(2));
      const totalAmount = Math.max(Number((subtotal - discountAmount).toFixed(2)), 0);
      const walletRequested = Number(walletUse || 0);
      const walletUsed = Math.min(walletRequested, user.walletBalance, totalAmount);
      const amountPaidOnline = Math.max(Number((totalAmount - walletUsed).toFixed(2)), 0);
      const dailyOrderNumber = await getNextDailyOrderNumber({ mealDate: menu.date, session });

      if (walletUsed > 0) {
        await debitWallet({
          userId: user._id,
          amount: walletUsed,
          reason: 'order payment',
          session,
          meta: { stage: 'order-create' }
        });
      }

      if (loyaltyPointsRedeemed > 0) {
        await user.save({ session });
      }

      const paymentMethod = amountPaidOnline === 0
        ? 'wallet'
        : walletUsed > 0
          ? 'hybrid'
          : 'razorpay';

      const order = await Order.create(
        [{
          orderCode: createOrderCode(),
          userId: user._id,
          menuId: menu._id,
          mealDate: menu.date,
          slot,
          quantity: Number(quantity),
          subtotal,
          addonTotal,
          addonItems,
          discountAmount,
          couponCode: appliedCouponCode,
          couponDiscount,
          totalAmount,
          walletUsed,
          loyaltyPointsRedeemed,
          loyaltyPointsCredited: 0,
          amountPaidOnline,
          paymentMethod,
          paymentStatus: amountPaidOnline === 0 ? 'completed' : 'pending',
          orderStatus: amountPaidOnline === 0 ? 'confirmed' : 'pending',
          dailyOrderNumber,
          fulfillmentType
        }],
        { session }
      );

      const createdOrder = order[0];
      let razorpayOrder = null;

      if (amountPaidOnline > 0) {
        razorpayOrder = await createRazorpayOrder({
          amount: amountPaidOnline,
          receipt: createdOrder.orderCode,
          notes: {
            localOrderId: String(createdOrder._id),
            userId: String(user._id)
          }
        });

        createdOrder.razorpayOrderId = razorpayOrder.id;
        await createdOrder.save({ session });
      }

      responsePayload = {
        order: createdOrder,
        razorpayOrder,
        needsOnlinePayment: amountPaidOnline > 0,
        paymentBreakdown: {
          subtotal,
          couponDiscount,
          loyaltyDiscount,
          discountAmount,
          creditsUsed: walletUsed,
          bankAmount: amountPaidOnline,
          totalAmount
        }
      };
    });
  } finally {
    await session.endSession();
  }

  const order = await Order.findById(responsePayload.order._id).lean();
  const user = await User.findById(req.user._id).lean();

  if (!responsePayload.needsOnlinePayment) {
    runInBackground('order-confirmation-notify', async () => {
      await Promise.allSettled([
        sendTemplatedEmail('orderConfirmation', user.email, { name: user.name, order }),
        sendTemplatedEmail('paymentSuccess', user.email, { name: user.name, order }),
        createNotification({
          userId: user._id,
          title: 'Order placed',
          message: `Your order ${order.orderCode} is confirmed.`,
          type: 'order',
          meta: { orderId: order._id }
        })
      ]);
    });
  }

  res.status(201).json({
    success: true,
    message: responsePayload.needsOnlinePayment ? 'Order created. Complete payment to confirm.' : 'Order confirmed',
    data: {
      order,
      razorpayOrder: responsePayload.razorpayOrder,
      needsOnlinePayment: responsePayload.needsOnlinePayment,
      razorpayKeyId: env.razorpay.keyId,
      paymentBreakdown: responsePayload.paymentBreakdown
    }
  });
});

const listMyOrders = asyncHandler(async (req, res) => {
  await autoCancelExpiredPendingOrders();

  const type = req.query.type || 'all';
  const now = dayjs().startOf('day').toDate();

  const filter = { userId: req.user._id };
  if (type === 'upcoming') {
    filter.mealDate = { $gte: now };
    filter.orderStatus = { $nin: ['cancelled'] };
  }

  if (type === 'history') {
    filter.$or = [
      { mealDate: { $lt: now } },
      { orderStatus: { $in: ['delivered', 'cancelled'] } }
    ];
  }

  const orders = await Order.find(filter)
    .select(
      'orderCode dailyOrderNumber mealDate slot quantity subtotal addonTotal addonItems discountAmount couponCode couponDiscount totalAmount walletUsed '
      + 'amountPaidOnline paymentMethod paymentStatus orderStatus fulfillmentType cancellationReason '
      + 'cancelledAt createdAt menuId loyaltyPointsRedeemed loyaltyPointsCredited'
    )
    .populate({
      path: 'menuId',
      select: 'items'
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: orders });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, userId: req.user._id })
    .populate('menuId')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({ success: true, data: order });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const reason = req.body.reason || 'Cancelled by user';

  const session = await mongoose.startSession();
  let cancelledOrder;
  let processedRefundAmount = 0;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, userId: req.user._id }).session(session);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      if (['cancelled', 'delivered'].includes(order.orderStatus)) {
        throw new ApiError(400, `Order cannot be cancelled in ${order.orderStatus} state`);
      }

      const menu = await Menu.findById(order.menuId).session(session);
      if (!menu) {
        throw new ApiError(404, 'Menu not found');
      }

      if (dayjs().isAfter(dayjs(menu.cutoffTime))) {
        throw new ApiError(400, 'Cancellation window closed (cutoff passed)');
      }

      await releasePlates({ menuId: menu._id, slot: order.slot, quantity: order.quantity, session });

      let refundAmount = 0;
      if (order.paymentStatus === 'completed') {
        refundAmount = order.totalAmount;
      } else if (order.paymentStatus === 'pending') {
        refundAmount = order.walletUsed;
      }

      if (refundAmount > 0) {
        await creditWallet({
          userId: order.userId,
          amount: refundAmount,
          reason: 'refund',
          orderId: order._id,
          session,
          meta: { reason }
        });
      }
      processedRefundAmount = refundAmount;

      if (order.loyaltyPointsRedeemed > 0) {
        await User.findByIdAndUpdate(order.userId, {
          $inc: { loyaltyPoints: order.loyaltyPointsRedeemed }
        }, { session });
      }

      const reversiblePoints = getReversibleLoyaltyPoints(order);
      if (reversiblePoints > 0) {
        await deductLoyaltyPoints({
          userId: order.userId,
          points: reversiblePoints,
          orderId: order._id,
          session,
          meta: { reason: 'order-cancelled' }
        });
        order.loyaltyPointsCredited = 0;
      }

      order.orderStatus = 'cancelled';
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.paymentStatus = refundAmount > 0 ? 'refunded' : 'failed';
      order.refundMethod = refundAmount > 0 ? 'wallet' : null;
      order.refundStatus = refundAmount > 0 ? 'processed' : 'none';
      await order.save({ session });

      cancelledOrder = order;
    });
  } finally {
    await session.endSession();
  }

  const user = await User.findById(req.user._id).lean();
  runInBackground('cancel-refund-notify', async () => {
    await Promise.allSettled([
      sendTemplatedEmail('refundConfirmation', user.email, {
        name: user.name,
        amount: processedRefundAmount
      }),
      createNotification({
        userId: user._id,
        title: 'Order cancelled',
        message: `Order ${cancelledOrder.orderCode} cancelled and refund processed.`,
        type: 'order',
        meta: { orderId: cancelledOrder._id }
      })
    ]);
  });

  res.json({ success: true, message: 'Order cancelled successfully', data: cancelledOrder });
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, userId: req.user._id });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const user = await User.findById(req.user._id);
  const pdf = await generateInvoiceBuffer(order, user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderCode}.pdf`);
  res.send(pdf);
});

const markOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus, cancellationReason = '' } = req.body;
  const normalizedCancellationReason = String(cancellationReason || '').trim();

  const session = await mongoose.startSession();
  let updatedOrder = null;
  let creditGiven = false;
  let creditAmount = 0;
  let loyaltyGiven = false;
  let loyaltyPointsAdded = 0;
  let cancelledRefundAmount = 0;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      if (order.orderStatus === orderStatus) {
        updatedOrder = order;
        return;
      }

      const allowedNext = ORDER_STATUS_TRANSITIONS[order.orderStatus] || [];
      if (!allowedNext.includes(orderStatus)) {
        throw new ApiError(400, `Invalid status transition from ${order.orderStatus} to ${orderStatus}`);
      }

      if (orderStatus === 'cancelled') {
        await releasePlates({ menuId: order.menuId, slot: order.slot, quantity: order.quantity, session });

        let refundAmount = 0;
        if (order.paymentStatus === 'completed') {
          refundAmount = order.totalAmount;
        } else if (order.paymentStatus === 'pending') {
          refundAmount = order.walletUsed;
        }

        if (refundAmount > 0) {
          await creditWallet({
            userId: order.userId,
            amount: refundAmount,
            reason: 'refund',
            orderId: order._id,
            session,
            meta: { reason: normalizedCancellationReason || 'Cancelled by admin', cancelledBy: req.user._id }
          });
        }
        cancelledRefundAmount = refundAmount;

        if (order.loyaltyPointsRedeemed > 0) {
          await User.findByIdAndUpdate(order.userId, {
            $inc: { loyaltyPoints: order.loyaltyPointsRedeemed }
          }, { session });
        }

        const reversiblePoints = getReversibleLoyaltyPoints(order);
        if (reversiblePoints > 0) {
          await deductLoyaltyPoints({
            userId: order.userId,
            points: reversiblePoints,
            orderId: order._id,
            session,
            meta: { reason: 'admin-cancelled-order' }
          });
          order.loyaltyPointsCredited = 0;
        }

        order.orderStatus = 'cancelled';
        order.cancellationReason = normalizedCancellationReason || 'Cancelled by admin';
        order.cancelledAt = new Date();
        order.paymentStatus = refundAmount > 0 ? 'refunded' : 'failed';
        order.refundMethod = refundAmount > 0 ? 'wallet' : null;
        order.refundStatus = refundAmount > 0 ? 'processed' : 'none';
        await order.save({ session });

        updatedOrder = order;
        return;
      }

      order.orderStatus = orderStatus;

      if (orderStatus === 'delivered' && order.paymentStatus !== 'completed') {
        throw new ApiError(400, 'Unpaid/refunded order cannot be marked as delivered');
      }

      if (orderStatus === 'delivered' && !order.deliveredCreditIssued && env.deliveredOrderCredit > 0) {
        await creditWallet({
          userId: order.userId,
          amount: env.deliveredOrderCredit,
          reason: 'delivered order credit',
          orderId: order._id,
          session,
          meta: { orderCode: order.orderCode }
        });

        order.deliveredCreditIssued = true;
        order.deliveredCreditAmount = env.deliveredOrderCredit;
        creditGiven = true;
        creditAmount = env.deliveredOrderCredit;
      }

      if (orderStatus === 'delivered' && order.loyaltyPointsCredited <= 0 && env.loyalty.pointsPerOrder > 0) {
        await addLoyaltyPoints({
          userId: order.userId,
          points: env.loyalty.pointsPerOrder,
          orderId: order._id,
          session
        });
        order.loyaltyPointsCredited = env.loyalty.pointsPerOrder;
        loyaltyGiven = true;
        loyaltyPointsAdded = env.loyalty.pointsPerOrder;
      }

      await order.save({ session });
      updatedOrder = order;
    });
  } finally {
    await session.endSession();
  }

  const order = await Order.findById(updatedOrder._id).populate('userId').lean();

  if (orderStatus === 'ready') {
    runInBackground('order-ready-notify', async () => {
      await Promise.allSettled([
        sendTemplatedEmail('orderReady', order.userId.email, { name: order.userId.name, order }),
        createNotification({
          userId: order.userId._id,
          title: 'Order ready',
          message: `Order ${order.orderCode} is ready for pickup/dine-in.`,
          type: 'order',
          meta: { orderId: order._id }
        })
      ]);
    });
  }

  if (orderStatus === 'delivered') {
    runInBackground('order-delivered-notify', async () => {
      await createNotification({
        userId: order.userId._id,
        title: 'Order delivered',
        message: `${creditGiven ? `INR ${creditAmount.toFixed(2)} wallet credit added. ` : ''}${loyaltyGiven ? `${loyaltyPointsAdded} loyalty points added. ` : ''}Order ${order.orderCode} delivered.`.trim(),
        type: 'order',
        meta: { orderId: order._id, creditAmount, loyaltyPointsAdded }
      });
    });
  }

  if (orderStatus === 'cancelled') {
    runInBackground('order-cancelled-by-admin-notify', async () => {
      await createNotification({
        userId: order.userId._id,
        title: 'Order cancelled by admin',
        message: `Order ${order.orderCode} cancelled. Reason: ${order.cancellationReason}${cancelledRefundAmount > 0 ? ` | Refund INR ${cancelledRefundAmount.toFixed(2)} processed.` : ''}`,
        type: 'order',
        meta: { orderId: order._id, cancellationReason: order.cancellationReason, refundAmount: cancelledRefundAmount }
      });
    });
  }

  res.json({
    success: true,
    message: 'Order status updated',
    data: {
      ...order,
      deliveredCreditAdded: creditGiven,
      deliveredCreditAmount: creditAmount,
      loyaltyPointsAdded
    }
  });
});

const failPendingOrderAndRelease = async ({ orderId, reason = 'Payment failed' }) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order || order.paymentStatus !== 'pending') return;

      await releasePlates({ menuId: order.menuId, slot: order.slot, quantity: order.quantity, session });

      if (order.walletUsed > 0) {
        await creditWallet({
          userId: order.userId,
          amount: order.walletUsed,
          reason: 'refund',
          orderId: order._id,
          session,
          meta: { reason: 'payment-failure' }
        });
      }

      if (order.loyaltyPointsRedeemed > 0) {
        await User.findByIdAndUpdate(order.userId, {
          $inc: { loyaltyPoints: order.loyaltyPointsRedeemed }
        }, { session });
      }

      order.paymentStatus = order.walletUsed > 0 ? 'refunded' : 'failed';
      order.orderStatus = 'cancelled';
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.refundMethod = order.walletUsed > 0 ? 'wallet' : null;
      order.refundStatus = order.walletUsed > 0 ? 'processed' : 'none';
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
};

const autoCancelExpiredPendingOrders = async () => {
  if (pendingPaymentSweepRunning) return;

  pendingPaymentSweepRunning = true;
  try {
    const expiryCutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MS);
    const stalePendingOrders = await Order.find({
      paymentStatus: 'pending',
      orderStatus: 'pending',
      createdAt: { $lte: expiryCutoff }
    })
      .select('_id')
      .lean();

    for (const staleOrder of stalePendingOrders) {
      await failPendingOrderAndRelease({
        orderId: staleOrder._id,
        reason: 'Auto-cancelled: payment not completed within 5 minutes'
      });
    }
  } finally {
    pendingPaymentSweepRunning = false;
  }
};

const startPendingPaymentAutoCancelScheduler = () => {
  if (pendingPaymentSweepInterval) return;

  runInBackground('pending-payment-autocancel-bootstrap', autoCancelExpiredPendingOrders);

  pendingPaymentSweepInterval = setInterval(() => {
    runInBackground('pending-payment-autocancel-sweep', autoCancelExpiredPendingOrders);
  }, PENDING_PAYMENT_SWEEP_INTERVAL_MS);

  if (typeof pendingPaymentSweepInterval.unref === 'function') {
    pendingPaymentSweepInterval.unref();
  }
};

module.exports = {
  createOrder,
  listMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  markOrderStatus,
  failPendingOrderAndRelease,
  startPendingPaymentAutoCancelScheduler,
  ORDER_STATUS_TRANSITIONS
};
