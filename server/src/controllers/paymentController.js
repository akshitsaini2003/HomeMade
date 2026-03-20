const mongoose = require('mongoose');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyRazorpaySignature, verifyWebhookSignature } = require('../services/paymentService');
const { sendTemplatedEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { runInBackground } = require('../utils/backgroundTask');
const { failPendingOrderAndRelease } = require('./orderController');

const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const isValid = verifyRazorpaySignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  });

  if (!isValid) {
    throw new ApiError(400, 'Payment signature verification failed');
  }

  const session = await mongoose.startSession();
  let updatedOrder;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
        razorpayOrderId
      }).session(session);

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      if (order.paymentStatus === 'completed') {
        updatedOrder = order;
        return;
      }

      if (order.paymentStatus !== 'pending') {
        throw new ApiError(400, `Order payment is ${order.paymentStatus}`);
      }

      order.paymentId = razorpayPaymentId;
      order.paymentStatus = 'completed';
      order.orderStatus = 'confirmed';
      await order.save({ session });

      updatedOrder = order;
    });
  } finally {
    await session.endSession();
  }

  const order = await Order.findById(updatedOrder._id).populate('userId').lean();

  runInBackground('payment-success-notify', async () => {
    await Promise.allSettled([
      sendTemplatedEmail('orderConfirmation', order.userId.email, { name: order.userId.name, order }),
      sendTemplatedEmail('paymentSuccess', order.userId.email, { name: order.userId.name, order }),
      createNotification({
        userId: order.userId._id,
        title: 'Payment confirmed',
        message: `Payment received for order ${order.orderCode}.`,
        type: 'payment',
        meta: { orderId: order._id }
      })
    ]);
  });

  res.json({ success: true, message: 'Payment verified and order confirmed', data: order });
});

const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawPayload = req.rawBody || JSON.stringify(req.body);

  if (!signature) {
    throw new ApiError(400, 'Missing webhook signature');
  }

  const valid = verifyWebhookSignature({ payload: rawPayload, signature });
  if (!valid) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const event = req.body.event;
  const entity = req.body.payload?.payment?.entity;

  if (event === 'payment.captured' && entity?.order_id) {
      const order = await Order.findOne({ razorpayOrderId: entity.order_id }).populate('userId').lean();

    if (order && order.paymentStatus === 'pending') {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const freshOrder = await Order.findById(order._id).session(session);
          if (!freshOrder || freshOrder.paymentStatus !== 'pending') return;

          freshOrder.paymentId = entity.id;
          freshOrder.paymentStatus = 'completed';
          freshOrder.orderStatus = 'confirmed';
          await freshOrder.save({ session });
        });
      } finally {
        await session.endSession();
      }

      runInBackground('webhook-payment-success-notify', async () => {
        await Promise.allSettled([
          sendTemplatedEmail('orderConfirmation', order.userId.email, { name: order.userId.name, order }),
          sendTemplatedEmail('paymentSuccess', order.userId.email, { name: order.userId.name, order }),
          createNotification({
            userId: order.userId._id,
            title: 'Order confirmed',
            message: `Order ${order.orderCode} is confirmed.`,
            type: 'order',
            meta: { orderId: order._id }
          })
        ]);
      });
    }
  }

  if ((event === 'payment.failed' || event === 'payment.authorized') && entity?.order_id) {
    const order = await Order.findOne({ razorpayOrderId: entity.order_id });
    if (order && order.paymentStatus === 'pending') {
      await failPendingOrderAndRelease({ orderId: order._id, reason: 'Payment failed via webhook' });
    }
  }

  res.json({ success: true });
});

module.exports = {
  verifyPayment,
  razorpayWebhook
};
