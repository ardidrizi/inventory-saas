import client from './client';
import { DashboardStats } from '../types';

export const getStats = () =>
  client.get<DashboardStats>('/dashboard').then((r) => r.data);
