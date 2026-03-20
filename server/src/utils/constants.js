const ORDER_STATUS = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
const PAYMENT_STATUS = ['pending', 'completed', 'failed', 'refunded'];
const SLOT_TYPES = ['lunch', 'dinner'];
const FULFILLMENT_TYPES = ['pickup', 'dinein'];

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  SLOT_TYPES,
  FULFILLMENT_TYPES
};
