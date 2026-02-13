import client from './client';
import { User } from '../types';

export const getUsers = () =>
  client.get<User[]>('/users').then((r) => r.data);

export const updateRole = (id: string, role: 'admin' | 'manager') =>
  client.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data);

export const updateStatus = (id: string, isActive: boolean) =>
  client.patch<User>(`/users/${id}/status`, { isActive }).then((r) => r.data);
