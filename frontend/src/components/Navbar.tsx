"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { NotificationsDropdown } from "./NotificationsDropdown";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  LogOut,
  UserCheck,
  Radio,
  ChevronDown,
  Check,
  Menu,
  X,
  ShieldCheck,
  Briefcase,
  Code2,
  Eye,
  User as UserIcon,
  Bell,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, quickDemoLogin, isAdmin } = useAuth();
  const { isConnected } = useSocket();
  const pathname = usePathname();
  const router = useRouter();

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRoleSwitcher(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowRoleSwitcher(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Determine Persona Details
  const getPersonaInfo = () => {
    if (!user) return null;
    if (user.systemRole === "ADMIN" || user.email === "admin@neostats.com") {
      return {
        key: "ADMIN" as const,
        title: "System Admin",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        avatarBg: "from-blue-600 to-indigo-600",
        icon: ShieldCheck,
      };
    }
    if (user.email === "pm@neostats.com") {
      return {
        key: "PM" as const,
        title: "Project Manager",
        color: "bg-indigo-100 text-indigo-700 border-indigo-200",
        avatarBg: "from-indigo-600 to-purple-600",
        icon: Briefcase,
      };
    }
    if (user.email === "member@neostats.com") {
      return {
        key: "MEMBER" as const,
        title: "Team Member",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        avatarBg: "from-emerald-600 to-teal-600",
        icon: Code2,
      };
    }
    if (user.email === "viewer@neostats.com") {
      return {
        key: "VIEWER" as const,
        title: "Viewer (Read-Only)",
        color: "bg-amber-100 text-amber-700 border-amber-200",
        avatarBg: "from-amber-600 to-orange-600",
        icon: Eye,
      };
    }
    return {
      key: "MEMBER" as const,
      title: "Team Member",
      color: "bg-slate-100 text-slate-700 border-slate-200",
      avatarBg: "from-slate-600 to-slate-800",
      icon: UserIcon,
    };
  };

  const persona = getPersonaInfo();

  // Public Navbar for unauthenticated state
  if (!user) {
    return (
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-extrabold text-white shadow-xs">
              N
            </span>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
              Neo<span className="text-blue-600">Stats</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/#demo-personas"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-3 py-2 transition-colors"
            >
              Demo Personas
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    ...(isAdmin ? [{ label: "Users (Admin)", href: "/users", icon: Users }] : []),
  ];

  const roles = [
    {
      key: "ADMIN" as const,
      label: "System Admin",
      email: "admin@neostats.com",
      desc: "Full system administration & project creation",
      icon: ShieldCheck,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "PM" as const,
      label: "Project Manager",
      email: "pm@neostats.com",
      desc: "Team assignments, tasks & project oversight",
      icon: Briefcase,
      color: "text-indigo-600 dark:text-indigo-400",
    },
    {
      key: "MEMBER" as const,
      label: "Team Member",
      email: "member@neostats.com",
      desc: "Update tasks, move columns & write comments",
      icon: Code2,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "VIEWER" as const,
      label: "Viewer",
      email: "viewer@neostats.com",
      desc: "Read-only board & activity log inspection",
      icon: Eye,
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  const handleRoleSelect = async (roleKey: "ADMIN" | "PM" | "MEMBER" | "VIEWER") => {
    setShowRoleSwitcher(false);
    await quickDemoLogin(roleKey);
    // Refresh current view to guarantee clean permission sync
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Desktop Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-extrabold text-white shadow-xs">
              N
            </span>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
              Neo<span className="text-blue-600">Stats</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-xs"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Socket Status, Role Switcher, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Socket Indicator */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isConnected
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                : "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
            }`}
            title={isConnected ? "Real-time Socket.IO connected" : "Connecting..."}
          >
            {isConnected ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <Radio className="h-3 w-3 text-zinc-400" />
            )}
            <span>{isConnected ? "Live Sync" : "Connecting"}</span>
          </div>

          {/* Quick Demo Switcher Dropdown */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 active:scale-[0.98] transition-all dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Switch Role</span>
              <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${persona?.color}`}>
                {persona?.title}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-2xl z-50 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Live Demo Persona Switcher
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold dark:text-blue-400">1-Click</span>
                </div>

                <div className="mt-1 space-y-1">
                  {roles.map((r) => {
                    const RoleIcon = r.icon;
                    const isActive = persona?.key === r.key;

                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleRoleSelect(r.key)}
                        className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all active:scale-[0.98] ${
                          isActive
                            ? "bg-blue-50/80 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-900/60"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-lg p-1.5 bg-zinc-100 dark:bg-zinc-800 ${r.color}`}>
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                                {r.label}
                              </span>
                              {isActive && (
                                <span className="rounded bg-blue-600 px-1 py-0.2 text-[9px] font-bold text-white">
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight block">
                              {r.desc}
                            </span>
                          </div>
                        </div>

                        {isActive && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <NotificationsDropdown />

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              title="View Profile & Capability Matrix"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr ${persona?.avatarBg} text-xs font-extrabold text-white shadow-xs`}
              >
                {user.name.charAt(0)}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">
                  {user.name}
                </p>
                <span className={`inline-block rounded border px-1 py-0.2 text-[9px] font-semibold ${persona?.color}`}>
                  {persona?.title}
                </span>
              </div>
            </Link>

            <button
              onClick={logout}
              className="rounded-xl p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 active:scale-[0.98] transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200/80 bg-white p-4 space-y-2 dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in duration-150">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              pathname === "/notifications"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </div>
      )}
    </header>
  );
};
