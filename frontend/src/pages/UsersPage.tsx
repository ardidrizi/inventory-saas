import React, { useState, useEffect, useCallback } from 'react';
import * as usersApi from '../api/users.api';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (id: string, newRole: 'admin' | 'manager') => {
    try {
      await usersApi.updateRole(id, newRole);
      toast.success('Role updated');
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (target: User) => {
    const action = target.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${target.name}?`)) return;
    try {
      await usersApi.updateStatus(target._id, !target.isActive);
      toast.success(`User ${action}d`);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || `Failed to ${action} user`);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold text-gray-800">
          👥 Users <span className="text-lg font-normal text-gray-500">({users.length})</span>
        </h1>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50 text-sm text-gray-600">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-center font-semibold">Role</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u._id === currentUser?._id;
                return (
                  <tr
                    key={u._id}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {u.name}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value as 'admin' | 'manager')}
                          className="cursor-pointer rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                        >
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`cursor-pointer rounded px-3 py-1 text-xs font-medium text-white transition-colors ${
                              u.isActive
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
