import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { env } from '../config/env';

const JWT_EXPIRES_IN = '7d';

const generateToken = (user: IUser): string => {
  return jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const register = async (data: {
  email: string;
  password: string;
  name: string;
}) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const user = await User.create({ ...data, role: 'manager' });
  const token = generateToken(user);
  return { user, token };
};

export const login = async (data: { email: string; password: string }) => {
  const user = await User.findOne({ email: data.email });
  if (!user || !(await user.comparePassword(data.password))) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const token = generateToken(user);
  return { user, token };
};

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user;
};
