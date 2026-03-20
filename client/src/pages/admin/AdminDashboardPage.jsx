import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import Loader from '../../components/common/Loader';
import StatTile from '../../components/admin/StatTile';
import AdminNav from '../../components/admin/AdminNav';
import { getErrorMessage } from '../../utils/http';

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: d }, { data: i }] = await Promise.all([
          client.get('/admin/dashboard'),
          client.get('/admin/inventory')
        ]);
        setDashboard(d.data);
        setInventory(i.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load admin dashboard'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <section className="page"><Loader text="Loading admin analytics" /></section>;
  }

  if (error) {
    return <section className="page"><p className="error-text">{error}</p></section>;
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <AdminNav />
        <h2>Admin dashboard</h2>
        <div className="grid cols-3">
          <StatTile label="Today's revenue" value={`INR ${dashboard.todayRevenue.toFixed(2)}`} />
          <StatTile label="Completed orders" value={dashboard.totalOrdersCompleted} />
          <StatTile label="Average order value" value={`INR ${dashboard.averageOrderValue.toFixed(2)}`} />
        </div>
      </article>

      <article className="page">
        <h3>Revenue by slot</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.revenueBySlot.map((slot) => (
                <tr key={slot._id}>
                  <td>{slot._id}</td>
                  <td>{slot.orders}</td>
                  <td>INR {slot.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="page">
        <h3>Top customers</h3>
        {dashboard.topCustomers.length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Total spent</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topCustomers.map((user) => (
                  <tr key={user._id || user.email}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.orders}</td>
                    <td>INR {user.totalSpent.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="page">
        <h3>Inventory snapshot</h3>
        {inventory.tomorrow ? (
          <div className="grid cols-3">
            <StatTile label="Total plates" value={inventory.tomorrow.totalPlates} />
            <StatTile label="Sold" value={inventory.tomorrow.soldPlates} />
            <StatTile label="Remaining" value={inventory.tomorrow.remainingPlates} />
          </div>
        ) : (
          <p>No tomorrow menu available.</p>
        )}
      </article>
    </section>
  );
};

export default AdminDashboardPage;
