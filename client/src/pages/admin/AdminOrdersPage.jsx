import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import client from '../../api/client';
import AdminNav from '../../components/admin/AdminNav';
import { getErrorMessage } from '../../utils/http';

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ date: '', slot: '', paymentStatus: '', orderStatus: '' });
  const [loading, setLoading] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState({});

  const formatAmount = (value) => Number(value || 0).toFixed(2);

  const loadOrders = async (applied = filters) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      Object.entries(applied).forEach(([k, v]) => {
        if (v) qs.append(k, v);
      });
      const { data } = await client.get(`/admin/orders?${qs.toString()}`);
      setOrders(data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId, status) => {
    const targetOrder = orders.find((order) => order._id === orderId);
    if (!targetOrder || targetOrder.orderStatus === status) return;

    let cancellationReason = '';
    if (status === 'cancelled') {
      cancellationReason = window.prompt('Cancellation reason (required for user visibility):', targetOrder.cancellationReason || '')?.trim() || '';
      if (!cancellationReason) {
        toast.error('Cancellation reason is required');
        return;
      }
    }

    const previousStatus = targetOrder.orderStatus;
    const previousReason = targetOrder.cancellationReason;
    setOrders((prev) => prev.map((order) => (
      order._id === orderId ? { ...order, orderStatus: status, cancellationReason: cancellationReason || order.cancellationReason } : order
    )));

    try {
      const payload = { orderStatus: status };
      if (status === 'cancelled') payload.cancellationReason = cancellationReason;

      const { data } = await client.patch(`/orders/admin/${orderId}/status`, payload);
      const deliveredCreditAmount = data?.data?.deliveredCreditAmount || 0;
      const loyaltyPointsAdded = data?.data?.loyaltyPointsAdded || 0;
      if (status === 'delivered' && (deliveredCreditAmount > 0 || loyaltyPointsAdded > 0)) {
        toast.success(`Delivered. Wallet credit INR ${deliveredCreditAmount.toFixed(2)} | Loyalty +${loyaltyPointsAdded}`);
      } else {
        toast.success('Order updated');
      }
    } catch (error) {
      setOrders((prev) => prev.map((order) => (
        order._id === orderId ? { ...order, orderStatus: previousStatus, cancellationReason: previousReason } : order
      )));
      toast.error(getErrorMessage(error, 'Status update failed'));
    }
  };

  const toggleDetails = (orderId) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const exportCsv = async () => {
    try {
      const query = filters.date ? `?date=${filters.date}` : '';
      const response = await client.get(`/admin/orders/export${query}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `orders-${filters.date || 'all'}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Export failed'));
    }
  };

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders]
  );

  return (
    <section className="page">
      <AdminNav />
      <div className="panel-head">
        <h2>Order management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn ghost" onClick={() => loadOrders(filters)}>Apply filters</button>
          <button type="button" className="btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 10 }}>
        <div>
          <label>Date</label>
          <input type="date" value={filters.date} onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))} />
        </div>
        <div>
          <label>Slot</label>
          <select value={filters.slot} onChange={(e) => setFilters((p) => ({ ...p, slot: e.target.value }))}>
            <option value="">All</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>
        <div>
          <label>Payment status</label>
          <select value={filters.paymentStatus} onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value }))}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div>
          <label>Order status</label>
          <select value={filters.orderStatus} onChange={(e) => setFilters((p) => ({ ...p, orderStatus: e.target.value }))}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading orders...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Order no</th>
                <th>User</th>
                <th>Date</th>
                <th>Slot</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Update</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const nextStatuses = STATUS_FLOW[order.orderStatus] || [];
                return (
                  <React.Fragment key={order._id}>
                    <tr>
                      <td>{order.orderCode}</td>
                      <td>{order.dailyOrderNumber || '-'}</td>
                      <td>{order.userId?.name}</td>
                      <td>{new Date(order.mealDate).toLocaleDateString()}</td>
                      <td>{order.slot}</td>
                      <td>{order.quantity}</td>
                      <td>INR {formatAmount(order.totalAmount)}</td>
                      <td>{order.paymentStatus}</td>
                      <td>{order.orderStatus}</td>
                      <td>
                        {nextStatuses.length === 0 ? (
                          <span>No next status</span>
                        ) : (
                          <div className="table-actions" style={{ flexWrap: 'wrap' }}>
                            {nextStatuses.map((status) => (
                              <button
                                key={`${order._id}-${status}`}
                                type="button"
                                className={`btn tiny ${status === 'cancelled' ? 'ghost' : ''}`}
                                onClick={() => updateStatus(order._id, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn tiny ghost" onClick={() => toggleDetails(order._id)}>
                          {expandedOrderIds[order._id] ? 'Hide details' : 'View order details'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderIds[order._id] && (
                      <tr>
                        <td colSpan={11} style={{ background: '#fffaf5' }}>
                          <div className="grid cols-2" style={{ gap: 12 }}>
                            <div>
                              <p><strong>Payment split</strong></p>
                              <p>Method: {order.paymentMethod}</p>
                              <p>Subtotal: INR {formatAmount(order.subtotal)}</p>
                              <p>Add-on total: INR {formatAmount(order.addonTotal)}</p>
                              <p>Coupon: {order.couponCode || 'none'} (INR {formatAmount(order.couponDiscount)})</p>
                              <p>Loyalty redeemed: {Number(order.loyaltyPointsRedeemed || 0)} pts</p>
                              <p>Credits used: INR {formatAmount(order.walletUsed)}</p>
                              <p>Bank paid: INR {formatAmount(order.amountPaidOnline)}</p>
                              <p>Total paid: INR {formatAmount(order.totalAmount)}</p>
                            </div>
                            <div>
                              <p><strong>Items</strong></p>
                              <p>Thali x{order.quantity}</p>
                              {order.menuId?.items?.length > 0 && (
                                <p>Thali includes: {order.menuId.items.map((item) => item.name).join(', ')}</p>
                              )}
                              {order.addonItems?.length > 0 ? (
                                <p>Add-ons: {order.addonItems.map((addon) => `${addon.name} x${addon.quantity}`).join(', ')}</p>
                              ) : (
                                <p>Add-ons: none</p>
                              )}
                              <p>Fulfillment: {order.fulfillmentType}</p>
                              <p>Created at: {new Date(order.createdAt).toLocaleString()}</p>
                              {order.cancellationReason && <p>Cancellation reason: {order.cancellationReason}</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminOrdersPage;
