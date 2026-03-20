import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Loader from '../components/common/Loader';
import { getErrorMessage } from '../utils/http';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await client.get('/users/dashboard');
        setData(response.data.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load dashboard'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <section className="page"><Loader text="Loading dashboard" /></section>;
  }

  if (error) {
    return <section className="page"><p className="error-text">{error}</p></section>;
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <h2>Hello, {data.profile.name}</h2>
        <p>Track your orders, wallet, and loyalty points here.</p>
        <div className="grid cols-3">
          <article className="stat-tile">
            <p>Wallet balance</p>
            <h3>INR {data.walletBalance.toFixed(2)}</h3>
          </article>
          <article className="stat-tile">
            <p>Loyalty points</p>
            <h3>{data.loyaltyPoints} pts</h3>
          </article>
          <article className="stat-tile">
            <p>Total spent</p>
            <h3>INR {data.stats.totalSpent.toFixed(2)}</h3>
          </article>
        </div>
      </article>

      <article className="page">
        <h3>Order stats</h3>
        <div className="grid cols-3">
          <article className="stat-tile">
            <p>Total orders</p>
            <h3>{data.stats.totalOrders}</h3>
          </article>
          <article className="stat-tile">
            <p>Upcoming</p>
            <h3>{data.stats.upcomingOrders}</h3>
          </article>
          <article className="stat-tile">
            <p>Delivered</p>
            <h3>{data.stats.completedOrders}</h3>
          </article>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" to="/menu">Book tomorrow meal</Link>
          <Link className="btn ghost" to="/orders">View orders</Link>
        </div>
      </article>

      <article className="page">
        <h3>Recent orders</h3>
        {data.recentOrders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.orderCode}</td>
                    <td>{new Date(order.mealDate).toLocaleDateString()}</td>
                    <td>{order.slot}</td>
                    <td>{order.orderStatus}</td>
                    <td>INR {order.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
};

export default DashboardPage;
