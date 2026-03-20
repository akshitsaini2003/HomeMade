import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import client from '../api/client';
import Loader from '../components/common/Loader';
import OrderRow from '../components/order/OrderRow';
import { getErrorMessage } from '../utils/http';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadOrders = async (type = filter, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await client.get(`/orders/my?type=${type}`);
      setOrders(data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load orders'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders(filter, { silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, [filter]);

  const cancelOrder = async (orderId) => {
    try {
      await client.post(`/orders/my/${orderId}/cancel`, { reason: 'Cancelled by user' });
      toast.success('Order cancelled');
      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Cancellation failed'));
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const response = await client.get(`/orders/my/${orderId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-${orderId}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Invoice download failed'));
    }
  };

  return (
    <section className="page">
      <div className="panel-head">
        <div>
          <h2>My orders</h2>
          <p style={{ marginTop: 4 }}>Detailed order breakdown with item list and payment split. Auto-refresh every 30s.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={`btn ${filter === 'all' ? '' : 'ghost'}`} onClick={() => { setFilter('all'); loadOrders('all'); }}>All</button>
          <button type="button" className={`btn ${filter === 'upcoming' ? '' : 'ghost'}`} onClick={() => { setFilter('upcoming'); loadOrders('upcoming'); }}>Upcoming</button>
          <button type="button" className={`btn ${filter === 'history' ? '' : 'ghost'}`} onClick={() => { setFilter('history'); loadOrders('history'); }}>History</button>
        </div>
      </div>

      {loading ? (
        <Loader text="Loading orders" />
      ) : orders.length === 0 ? (
        <p>No orders found for this filter.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Order No</th>
                <th>Meal Date</th>
                <th>Slot</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Credits</th>
                <th>Bank</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order._id}
                  order={order}
                  onCancel={cancelOrder}
                  onInvoice={downloadInvoice}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default OrdersPage;
