import React, { useState } from 'react';

const formatAmount = (value) => Number(value || 0).toFixed(2);
const toTitle = (value = '') => String(value)
  .split(/[\s_-]+/)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');

const formatFulfillment = (value) => {
  if (value === 'dinein') return 'Dine-in';
  if (value === 'pickup') return 'Pickup';
  return toTitle(value);
};

const OrderRow = ({ order, onCancel, onInvoice }) => {
  const [showDetails, setShowDetails] = useState(false);
  const menuItems = order.menuId?.items || [];
  const pendingAutoCancelAt = order.paymentStatus === 'pending'
    ? new Date(new Date(order.createdAt).getTime() + (5 * 60 * 1000))
    : null;

  return (
    <>
      <tr>
        <td>{order.orderCode}</td>
        <td>{order.dailyOrderNumber || '-'}</td>
        <td>{new Date(order.mealDate).toLocaleDateString()}</td>
        <td>{toTitle(order.slot)}</td>
        <td>{order.quantity}</td>
        <td>INR {formatAmount(order.totalAmount)}</td>
        <td>INR {formatAmount(order.walletUsed)}</td>
        <td>INR {formatAmount(order.amountPaidOnline)}</td>
        <td>{toTitle(order.paymentStatus)}</td>
        <td>{toTitle(order.orderStatus)}</td>
        <td>
          <div className="table-actions">
            <button type="button" className="btn tiny ghost" onClick={() => onInvoice(order._id)}>Invoice</button>
            <button type="button" className="btn tiny ghost" onClick={() => setShowDetails((prev) => !prev)}>
              {showDetails ? 'Hide Details' : 'View Details'}
            </button>
            {['pending', 'confirmed'].includes(order.orderStatus) && (
              <button type="button" className="btn tiny" onClick={() => onCancel(order._id)}>Cancel</button>
            )}
          </div>
        </td>
      </tr>
      {showDetails && (
        <tr>
          <td colSpan={11} style={{ background: '#fffaf5' }}>
            <div className="grid cols-2" style={{ gap: 12 }}>
              <div>
                <p><strong>Items in this Order</strong></p>
                <p>Thali x{order.quantity}</p>
                {menuItems.length > 0 && (
                  <p>Thali includes: {menuItems.map((item) => item.name).join(', ')}</p>
                )}
                {order.addonItems?.length > 0 ? (
                  <p>
                    Add-ons: {order.addonItems.map((addon) => `${addon.name} x${addon.quantity}`).join(', ')}
                  </p>
                ) : (
                  <p>Add-ons: None</p>
                )}
                <p>Fulfillment: {formatFulfillment(order.fulfillmentType)}</p>
              </div>
              <div>
                <p><strong>Amount Details</strong></p>
                <p>Subtotal: INR {formatAmount(order.subtotal)}</p>
                <p>Add-ons total: INR {formatAmount(order.addonTotal)}</p>
                <p>Coupon: {order.couponCode || 'None'}</p>
                <p>Coupon discount: INR {formatAmount(order.couponDiscount)}</p>
                <p>Discount: INR {formatAmount(order.discountAmount)}</p>
                <p>Credits used: INR {formatAmount(order.walletUsed)}</p>
                <p>Bank paid: INR {formatAmount(order.amountPaidOnline)}</p>
                <p>Total paid: INR {formatAmount(order.totalAmount)}</p>
                {pendingAutoCancelAt && order.orderStatus === 'pending' && (
                  <p className="error-text" style={{ marginTop: 6 }}>
                    Payment pending: auto-cancels at {pendingAutoCancelAt.toLocaleTimeString()} if unpaid.
                  </p>
                )}
                {order.orderStatus === 'cancelled' && order.cancellationReason && (
                  <p>Cancellation reason: {order.cancellationReason}</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default OrderRow;
