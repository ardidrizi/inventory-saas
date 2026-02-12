import client from './client';
import { AuthResponse, User } from '../types';

export const login = (data: { email: string; password: string }) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data);

export const register = (data: { email: string; password: string; name: string; role?: string }) =>
  client.post<AuthResponse>('/auth/register', data).then((r) => r.data);

export const getProfile = () =>
  client.get<User>('/auth/me').then((r) => r.data);
