"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldCheck,
  Briefcase,
  Code2,
  Eye,
  Copy,
  Check,
  Calendar,
  Mail,
  UserCheck,
  LogOut,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout, quickDemoLogin } = useAuth();
  const router = useRouter();
  const [copiedId, setCopiedId] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  if (!user) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSwitchPersona = async (roleKey: "ADMIN" | "PM" | "MEMBER" | "VIEWER") => {
    try {
      setSwitchingRole(roleKey);
      await quickDemoLogin(roleKey);
      router.refresh();
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setSwitchingRole(null);
    }
  };

  // Determine current active persona
  const getActiveRoleKey = (): "ADMIN" | "PM" | "MEMBER" | "VIEWER" => {
    if (user.systemRole === "ADMIN" || user.email === "admin@neostats.com") return "ADMIN";
    if (user.email === "pm@neostats.com") return "PM";
    if (user.email === "viewer@neostats.com") return "VIEWER";
    return "MEMBER";
  };

  const activeKey = getActiveRoleKey();

  const personas = [
    {
      key: "ADMIN" as const,
      name: "System Admin",
      email: "admin@neostats.com",
      icon: ShieldCheck,
      color: "from-blue-600 to-indigo-600",
      accent: "bg-blue-50 text-blue-700 border-blue-200",
      description: "Full root oversight across system users and all project workspaces.",
    },
    {
      key: "PM" as const,
      name: "Project Manager",
      email: "pm@neostats.com",
      icon: Briefcase,
      color: "from-indigo-600 to-purple-600",
      accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
      description: "Manage project team roster, assign tasks, and advance workflows.",
    },
    {
      key: "MEMBER" as const,
      name: "Team Member",
      email: "member@neostats.com",
      icon: Code2,
      color: "from-emerald-600 to-teal-600",
      accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description: "Collaborative member who creates tasks, transitions columns, and comments.",
    },
    {
      key: "VIEWER" as const,
      name: "Viewer (Read-Only)",
      email: "viewer@neostats.com",
      icon: Eye,
      color: "from-amber-600 to-orange-600",
      accent: "bg-amber-50 text-amber-700 border-amber-200",
      description: "Supervisory read-only access with zero edit permissions.",
    },
  ];

  // RBAC Capabilities Matrix
  const permissions = [
    {
      label: "System User Administration",
      desc: "Create users and deactivate accounts globally",
      admin: true,
      pm: false,
      member: false,
      viewer: false,
    },
    {
      label: "Create / Archive / Delete Projects",
      desc: "Provision new workspaces or alter project lifecycle state",
      admin: true,
      pm: false,
      member: false,
      viewer: false,
    },
    {
      label: "Manage Team Roster & Roles",
      desc: "Assign members to projects and configure project roles",
      admin: true,
      pm: true,
      member: false,
      viewer: false,
    },
    {
      label: "Create & Update Tasks",
      desc: "Add new work items, edit details, and set priorities",
      admin: true,
      pm: true,
      member: true,
      viewer: false,
    },
    {
      label: "Move Kanban Board Columns",
      desc: "Transition tasks between To Do, In Progress, In Review, and Done",
      admin: true,
      pm: true,
      member: true,
      viewer: false,
    },
    {
      label: "Post Comments & Collaborate",
      desc: "Participate in real-time task discussions and activity updates",
      admin: true,
      pm: true,
      member: true,
      viewer: false,
    },
    {
      label: "View Real-Time Board & Socket Events",
      desc: "Live stream updates as other collaborators make changes",
      admin: true,
      pm: true,
      member: true,
      viewer: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          User Profile & Live Switcher Hub
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Manage your session identity, test multi-role permissions, and view your active capability matrix.
        </p>
      </div>

      {/* User Identity Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-tr ${
                personas.find((p) => p.key === activeKey)?.color
              } text-2xl sm:text-3xl font-extrabold text-white shadow-md`}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{user.name}</h2>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                    personas.find((p) => p.key === activeKey)?.accent
                  }`}
                >
                  {personas.find((p) => p.key === activeKey)?.name}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Mail className="h-3.5 w-3.5" />
                <span>{user.email}</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 self-start sm:self-center rounded-2xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Metadata / Copy ID */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              System ID:
            </span>
            <span className="font-mono text-xs text-slate-700">{user.id}</span>
          </div>

          <button
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            {copiedId ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Embedded Live Persona Switcher */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Live Persona Switcher</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Switch Your Simulated Role in 1 Click
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Effortlessly evaluate how the platform dynamically enforces RBAC policies across distinct user types.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => {
            const Icon = p.icon;
            const isActive = activeKey === p.key;
            const isSwitching = switchingRole === p.key;

            return (
              <div
                key={p.key}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-2.5 text-white shadow-xs bg-gradient-to-tr ${p.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-bold text-sm text-slate-900">{p.name}</h3>
                  <p className="font-mono text-[11px] text-slate-400">{p.email}</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{p.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isActive || isSwitching}
                    onClick={() => handleSwitchPersona(p.key)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                      isActive
                        ? "cursor-default bg-blue-100 text-blue-700 font-bold"
                        : "bg-slate-900 text-white hover:bg-slate-800 active:scale-98 shadow-xs"
                    }`}
                  >
                    {isSwitching ? (
                      <span>Switching...</span>
                    ) : isActive ? (
                      <span>Currently Active</span>
                    ) : (
                      <>
                        <span>Switch to {p.name}</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Effective Capabilities Matrix */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Effective Capabilities Matrix</h2>
          <p className="mt-1 text-xs text-slate-500">
            Real-time permissions configured for your currently authenticated persona (
            <strong className="text-slate-800">{personas.find((p) => p.key === activeKey)?.name}</strong>
            ).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Action / Feature</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Your Active Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((perm, i) => {
                const isPermitted =
                  activeKey === "ADMIN"
                    ? perm.admin
                    : activeKey === "PM"
                    ? perm.pm
                    : activeKey === "MEMBER"
                    ? perm.member
                    : perm.viewer;

                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{perm.label}</td>
                    <td className="py-3.5 px-4 text-slate-500">{perm.desc}</td>
                    <td className="py-3.5 px-4 text-center">
                      {isPermitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Authorized</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                          <XCircle className="h-3.5 w-3.5 text-slate-400" />
                          <span>Restricted</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
