import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import client from '../../api/client';
import AdminNav from '../../components/admin/AdminNav';
import { getErrorMessage } from '../../utils/http';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  const loadUsers = async (keyword = '') => {
    try {
      const { data } = await client.get(`/admin/users?search=${encodeURIComponent(keyword)}`);
      setUsers(data.data.items);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load users'));
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleBlock = async (user) => {
    try {
      await client.patch(`/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked });
      toast.success(`User ${user.isBlocked ? 'unblocked' : 'blocked'}`);
      await loadUsers(search);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update user'));
    }
  };

  const creditLoyalty = async (user) => {
    const pointsInput = window.prompt(`Loyalty points to credit for ${user.name}:`, '100');
    const points = Number(pointsInput || 0);
    if (!Number.isFinite(points) || points <= 0) {
      toast.error('Valid loyalty points required');
      return;
    }

    const reason = window.prompt('Reason for loyalty credit:', 'Best customer') || '';

    try {
      await client.post(`/admin/users/${user._id}/loyalty-credit`, {
        points,
        reason
      });
      toast.success(`Loyalty +${points} credited`);
      await loadUsers(search);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to credit loyalty'));
    }
  };

  return (
    <section className="page">
      <AdminNav />
      <div className="panel-head">
        <h2>User management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search name/email/phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <button type="button" className="btn" onClick={() => loadUsers(search)}>Search</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Blocked</th>
              <th>Wallet</th>
              <th>Loyalty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.role}</td>
                <td>{user.isVerified ? 'Yes' : 'No'}</td>
                <td>{user.isBlocked ? 'Yes' : 'No'}</td>
                <td>INR {user.walletBalance?.toFixed(2)}</td>
                <td>{user.loyaltyPoints}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn tiny" onClick={() => toggleBlock(user)}>
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button type="button" className="btn tiny ghost" onClick={() => creditLoyalty(user)}>
                      Add Loyalty
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminUsersPage;
