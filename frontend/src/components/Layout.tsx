import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { path: '/', label: '📊 Dashboard' },
  { path: '/products', label: '📦 Products' },
  { path: '/orders', label: '🛒 Orders' },
  { path: '/users', label: '👥 Users', adminOnly: true },
  { path: '/audit', label: '📋 Audit Logs', adminOnly: true },
];

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 flex-col bg-slate-900 text-white">
        <div className="border-b border-slate-700 px-5 py-5">
          <h2 className="text-lg font-semibold">📦 Inventory SaaS</h2>
        </div>
        <div className="flex flex-1 flex-col py-2">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === 'admin')
            .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-5 py-3 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="border-t border-slate-700 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm">{user?.name}</p>
            <button
              onClick={toggleTheme}
              className="cursor-pointer rounded-md bg-slate-800 px-2 py-1 text-sm transition-colors hover:bg-slate-700"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-400">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="w-full cursor-pointer rounded bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto bg-gray-50 p-8 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
