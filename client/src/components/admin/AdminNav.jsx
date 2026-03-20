import React from 'react';
import { Link } from 'react-router-dom';

const AdminNav = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
    <Link className="btn ghost" to="/admin">Dashboard</Link>
    <Link className="btn ghost" to="/admin/menu">Menu</Link>
    <Link className="btn ghost" to="/admin/orders">Orders</Link>
    <Link className="btn ghost" to="/admin/users">Users</Link>
    <Link className="btn ghost" to="/admin/settings">Settings</Link>
  </div>
);

export default AdminNav;
