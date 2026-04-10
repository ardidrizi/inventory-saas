import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as ordersApi from '../api/orders.api';
import * as productsApi from '../api/products.api';
import { Order, Product } from '../types';
import { useAuth } from '../context/AuthContext';

const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const inputStyle: React.CSSProperties = {
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 4,
  boxSizing: 'border-box',
};

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const canManageOrders = user?.role === 'admin' || user?.role === 'manager';
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<{ product: string; quantity: number }[]>([
    { product: '', quantity: 1 },
  ]);
  const [customer, setCustomer] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [productsLoadError, setProductsLoadError] = useState('');
  const latestLoadRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestLoadRequestId.current;

    setLoading(true);
    setLoadError('');

    try {
      const data = await ordersApi.getOrders({ status: statusFilter || undefined, page });
      if (requestId !== latestLoadRequestId.current) return;

      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setTotalPages(data?.totalPages ?? 1);
    } catch {
      if (requestId !== latestLoadRequestId.current) return;

      setTotalPages(1);
      setLoadError('Failed to load orders. Please refresh and try again.');
    } finally {
      if (requestId === latestLoadRequestId.current) {
        setLoading(false);
      }
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = async () => {
    setProductsLoadError('');
    try {
      const data = await productsApi.getProducts({ limit: 100 });
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch {
      setProducts([]);
      setProductsLoadError('Could not load products. You can retry in a moment.');
    }
    setItems([{ product: '', quantity: 1 }]);
    setCustomer({ name: '', email: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await ordersApi.createOrder({
        items: items.filter((i) => i.product),
        customer,
      });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to create order');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await ordersApi.updateOrderStatus(id, status);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0 }}>Orders</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {canManageOrders && (
            <button
              onClick={openForm}
            style={{
              padding: '10px 20px',
              background: '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            + New Order
            </button>
          )}
        </div>
      </div>

      {canManageOrders && showForm && (
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create Order</h3>
          {error && (
            <div
              style={{
                background: '#ffe0e0',
                color: '#c00',
                padding: 10,
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}
          {productsLoadError && (
            <div
              style={{
                background: '#fff3cd',
                color: '#8a6d3b',
                padding: 10,
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              {productsLoadError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <input
                placeholder="Customer name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                placeholder="Customer email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                required
                style={inputStyle}
              />
            </div>
            <h4>Items</h4>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <select
                  value={item.product}
                  onChange={(e) => {
                    const next = [...items];
                    next[i].product = e.target.value;
                    setItems(next);
                  }}
                  required
                  style={{ ...inputStyle, flex: 2 }}
                >
                  <option value="">Select product</option>
                  {(Array.isArray(products) ? products : []).map((p) => (
                    <option key={p._id ?? p.name} value={p._id}>
                      {p.name || 'Unnamed'} (Stock: {p.quantity ?? 0})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...items];
                    next[i].quantity = Number(e.target.value);
                    setItems(next);
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                    style={{
                      padding: '8px 12px',
                      background: '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems([...items, { product: '', quantity: 1 }])}
              style={{
                padding: '6px 16px',
                background: '#eee',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              + Add Item
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Create Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
                style={{
                  padding: '10px 24px',
                  background: '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : loadError ? (
        <div
          style={{
            background: '#ffe0e0',
            color: '#c00',
            padding: 12,
            borderRadius: 6,
          }}
        >
          {loadError}
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', background: '#fafafa' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>Order #</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Customer</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Items</th>
                <th style={{ textAlign: 'right', padding: 12 }}>Total</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Date</th>
                {canManageOrders && <th style={{ textAlign: 'center', padding: 12 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(orders) ? orders : []).map((o) => (
                <tr key={o._id ?? o.orderNumber} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12, fontFamily: 'monospace' }}>{o.orderNumber || '-'}</td>
                  <td style={{ padding: 12 }}>{o.customer?.name || '-'}</td>
                  <td style={{ padding: 12 }}>{Array.isArray(o.items) ? o.items.length : 0} item(s)</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    ${(o.totalAmount ?? 0).toLocaleString()}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        background:
                          o.status === 'delivered'
                            ? '#e8f5e9'
                            : o.status === 'cancelled'
                              ? '#ffebee'
                              : '#e3f2fd',
                        color:
                          o.status === 'delivered'
                            ? '#2e7d32'
                            : o.status === 'cancelled'
                              ? '#c62828'
                              : '#1565c0',
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}
                  </td>
                  {canManageOrders && (
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o._id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 4 }}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: 24, textAlign: 'center', color: '#999' }}
                  >
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ padding: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{ padding: '6px 16px', cursor: 'pointer' }}
              >
                Prev
              </button>
              <span style={{ padding: '6px 12px' }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                style={{ padding: '6px 16px', cursor: 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
