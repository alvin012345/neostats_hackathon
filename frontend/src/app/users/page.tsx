"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { User, SystemRole } from "../../types";
import { api } from "../../lib/api";
import {
  Users as UsersIcon,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
} from "lucide-react";

export default function UsersAdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New User Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState<SystemRole>("USER");

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (isAdmin) {
        loadUsers();
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const loadUsers = async () => {
    try {
      const res = await api.get<{ data: User[] }>("/users");
      setUsers(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch users");
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const res = await api.post<{ data: User }>("/users", {
        name,
        email,
        password,
        systemRole,
      });
      setUsers((prev) => [res.data, ...prev]);
      setShowCreateModal(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create user");
    }
  };

  const handleToggleDeactivate = async (userId: string) => {
    setErrorMessage(null);
    try {
      const res = await api.patch<{ data: User }>(`/users/${userId}/deactivate`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to change user status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-24 px-4 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white">403 Forbidden: Access Denied</h1>
        <p className="mt-2 text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
          System Administrator privileges are strictly required to manage user accounts and system permissions.
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40">
              Admin Protected
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            System User Management
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Create, manage, and soft-deactivate system accounts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Create User</span>
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-100 bg-zinc-50/50 text-zinc-400 font-semibold uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">System Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {dataLoading ? (
                <>
                  {[1, 2, 3, 4].map((idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            <div className="h-2.5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 font-bold text-white shadow-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                          u.systemRole === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
                            : "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
                        }`}
                      >
                        {u.systemRole}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                          <XCircle className="h-3.5 w-3.5" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleDeactivate(u.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold active:scale-[0.98] transition-all ${
                          u.isActive
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40"
                        }`}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters..."
                  className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  System Role
                </label>
                <select
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                >
                  <option value="USER">Standard User</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs active:scale-[0.98] transition-all"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
