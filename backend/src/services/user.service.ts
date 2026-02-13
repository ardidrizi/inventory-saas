import User from '../models/User';

export const findAll = async () => {
  return User.find().select('-password').sort({ createdAt: -1 });
};

export const updateRole = async (userId: string, role: string) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.role = role as 'admin' | 'manager';
  await user.save();
  return user;
};

export const updateStatus = async (userId: string, isActive: boolean, requesterId: string) => {
  if (userId === requesterId) {
    throw Object.assign(new Error('Cannot change your own status'), { statusCode: 400 });
  }

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.isActive = isActive;
  await user.save();
  return user;
};
