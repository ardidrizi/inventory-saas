import client from './client';
import { Order } from '../types';

interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export const getOrders = (params?: { status?: string; page?: number; limit?: number }) =>
  client.get<OrderListResponse>('/orders', { params }).then((r) => r.data);

export const getOrder = (id: string) =>
  client.get<Order>(`/orders/${id}`).then((r) => r.data);

export const createOrder = (data: {
  items: { product: string; quantity: number }[];
  customer: { name: string; email: string };
}) => client.post<Order>('/orders', data).then((r) => r.data);

export const updateOrderStatus = (id: string, status: string) =>
  client.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data);
