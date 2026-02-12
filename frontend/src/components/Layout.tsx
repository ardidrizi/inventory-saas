import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: '📊 Dashboard' },
  { path: '/products', label: '📦 Products' },
  { path: '/orders', label: '🛒 Orders' },
];

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav
        style={{
          width: 220,
          background: '#1a1a2e',
          color: '#fff',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0 20px 20px',
            borderBottom: '1px solid #333',
            marginBottom: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>📦 Inventory SaaS</h2>
        </div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              padding: '12px 20px',
              color: location.pathname === item.path ? '#4fc3f7' : '#ccc',
              textDecoration: 'none',
              background: location.pathname === item.path ? '#16213e' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid #333' }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>{user?.role}</div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: 8,
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: 30, background: '#f5f6fa', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
