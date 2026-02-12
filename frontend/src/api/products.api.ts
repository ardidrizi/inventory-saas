import client from './client';
import { Product } from '../types';

interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export const getProducts = (params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => client.get<ProductListResponse>('/products', { params }).then((r) => r.data);

export const getProduct = (id: string) =>
  client.get<Product>(`/products/${id}`).then((r) => r.data);

export const createProduct = (data: Partial<Product>) =>
  client.post<Product>('/products', data).then((r) => r.data);

export const updateProduct = (id: string, data: Partial<Product>) =>
  client.put<Product>(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: string) =>
  client.delete(`/products/${id}`).then((r) => r.data);
