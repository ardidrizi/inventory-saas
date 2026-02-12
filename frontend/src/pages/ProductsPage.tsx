import React, { useState, useEffect, useCallback } from 'react';
import * as productsApi from '../api/products.api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', sku: '', description: '', price: 0, quantity: 0, category: '' };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 4,
  boxSizing: 'border-box',
  marginBottom: 12,
};

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productsApi.getProducts({ search: search || undefined, page });
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await productsApi.updateProduct(editingId, form);
      } else {
        await productsApi.createProduct(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsApi.deleteProduct(id);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Delete failed');
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
        <h1 style={{ margin: 0 }}>Products ({total})</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 4, width: 250 }}
          />
          {isAdmin && (
            <button
              onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
                setShowForm(true);
              }}
              style={{
                padding: '10px 20px',
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Product' : 'New Product'}</h3>
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
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Price"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
                min={0}
                step={0.01}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={form.quantity || ''}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                required
                min={0}
                style={inputStyle}
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
                {editingId ? 'Update' : 'Create'}
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
                <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 12 }}>SKU</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Category</th>
                <th style={{ textAlign: 'right', padding: 12 }}>Price</th>
                <th style={{ textAlign: 'right', padding: 12 }}>Stock</th>
                {isAdmin && <th style={{ textAlign: 'center', padding: 12 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>{p.name}</td>
                  <td style={{ padding: 12 }}>{p.sku}</td>
                  <td style={{ padding: 12 }}>{p.category}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>${p.price.toFixed(2)}</td>
                  <td
                    style={{
                      padding: 12,
                      textAlign: 'right',
                      color: p.quantity <= 10 ? '#e91e63' : 'inherit',
                      fontWeight: p.quantity <= 10 ? 700 : 400,
                    }}
                  >
                    {p.quantity}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(p)}
                        style={{
                          marginRight: 8,
                          padding: '4px 12px',
                          background: '#2196f3',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        style={{
                          padding: '4px 12px',
                          background: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: 24, textAlign: 'center', color: '#999' }}
                  >
                    No products found
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

export default ProductsPage;
