import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { notificationCount } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">HomeMade</Link>
        <nav>
          <NavLink to="/menu">Menu</NavLink>
          <NavLink to="/orders">Orders</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="topbar-actions">
          <Link to="/notifications" className="icon-btn">Alerts {notificationCount ? `(${notificationCount})` : ''}</Link>
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <button type="button" className="btn ghost" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn ghost">Login</Link>
              <Link to="/register" className="btn">Signup</Link>
            </>
          )}
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
};

export default MainLayout;
