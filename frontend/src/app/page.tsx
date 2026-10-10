"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Briefcase,
  Code2,
  Eye,
  ArrowRight,
  Zap,
  Lock,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
  Activity,
  Users,
} from "lucide-react";

export default function LandingPage() {
  const { user, quickDemoLogin, isLoading } = useAuth();
  const router = useRouter();
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);

  const handleQuickLaunch = async (role: "ADMIN" | "PM" | "MEMBER" | "VIEWER") => {
    try {
      setLoggingInRole(role);
      await quickDemoLogin(role);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to launch demo role:", err);
    } finally {
      setLoggingInRole(null);
    }
  };

  const demoPersonas = [
    {
      role: "ADMIN" as const,
      name: "System Admin",
      email: "admin@neostats.com",
      color: "from-blue-600 to-indigo-600",
      accentBg: "bg-blue-50 text-blue-700 border-blue-200",
      icon: ShieldCheck,
      capabilities: [
        "Full system user administration",
        "Create, delete & archive any project",
        "Direct full access across all boards",
      ],
    },
    {
      role: "PM" as const,
      name: "Project Manager",
      email: "pm@neostats.com",
      color: "from-indigo-600 to-purple-600",
      accentBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: Briefcase,
      capabilities: [
        "Manage project members & roles",
        "Orchestrate task priorities & assignments",
        "Project-level archive & configuration",
      ],
    },
    {
      role: "MEMBER" as const,
      name: "Team Member",
      email: "member@neostats.com",
      color: "from-emerald-600 to-teal-600",
      accentBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: Code2,
      capabilities: [
        "Create & update tasks on assigned boards",
        "Move tasks through Kanban workflow",
        "Post comments & collaborate in real-time",
      ],
    },
    {
      role: "VIEWER" as const,
      name: "Viewer",
      email: "viewer@neostats.com",
      color: "from-amber-600 to-orange-600",
      accentBg: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Eye,
      capabilities: [
        "Inspect project boards in real time",
        "View activity logs & task conversations",
        "Strict read-only safety (no accidental edits)",
      ],
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50/70">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-200/40 via-indigo-200/30 to-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-[600px] right-0 -z-10 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-teal-100/40 to-blue-100/30 blur-2xl" />

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/90 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-xs backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>NeoStats Hackathon • Production-Grade Collaborative Platform</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Real-Time Collaboration. <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Zero Silent Overwrites.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg sm:leading-relaxed">
            Enterprise project workspace powered by <strong>PostgreSQL 18</strong>, <strong>Prisma ORM</strong>,
            and <strong>Socket.IO</strong>. Enforces strict server-side RBAC and version-checked Optimistic
            Concurrency Control across every simultaneous user update.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              >
                <span>Go to Workspace Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              >
                <span>Sign In to Platform</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <a
              href="#demo-personas"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-xs backdrop-blur-md transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              <span>Explore 1-Click Personas</span>
              <Users className="h-4 w-4 text-slate-500" />
            </a>
          </div>
        </div>

        {/* 1-Click Interactive Demo Role Launcher */}
        <div id="demo-personas" className="mt-20 scroll-mt-20">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Interactive Evaluation Sandbox
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Select a Persona to Launch Instantly
            </h2>
            <p className="mt-2 max-w-xl text-xs text-slate-500 sm:text-sm">
              Click any card below to authenticate as that role with pre-configured permissions. No password entry required.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {demoPersonas.map((p) => {
              const Icon = p.icon;
              const isCurrent = user?.email === p.email;
              const isLaunching = loggingInRole === p.role;

              return (
                <div
                  key={p.role}
                  className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
                    isCurrent
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`rounded-2xl p-3 text-white shadow-md bg-gradient-to-tr ${p.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                          Active Now
                        </span>
                      ) : (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.accentBg}`}>
                          {p.role}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-900">{p.name}</h3>
                    <p className="font-mono text-xs text-slate-400">{p.email}</p>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Capabilities
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                        {p.capabilities.map((cap, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isLaunching}
                      onClick={() => handleQuickLaunch(p.role)}
                      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold transition-all shadow-xs ${
                        isCurrent
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : `text-white bg-gradient-to-r ${p.color} hover:opacity-95 active:scale-98`
                      }`}
                    >
                      {isLaunching ? (
                        <span>Authenticating...</span>
                      ) : isCurrent ? (
                        <span>Re-enter as {p.name}</span>
                      ) : (
                        <>
                          <span>Launch as {p.name}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-28">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Architectural Highlights
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Engineered for Real-World Scalability
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-xs text-slate-500 sm:text-sm">
              Built with zero compromises on data integrity, state synchronization, or security.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                Optimistic Concurrency Control
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Every task has an atomic version increment. If another collaborator commits changes while
                you are editing, a 409 conflict dialog lets you compare server vs local versions.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                Server-Enforced RBAC
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Permissions are secured at the Express middleware layer, not just hidden in the UI.
                Project Managers, Members, and Viewers strictly perform only authorized operations.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Radio className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                Live Socket.IO Rooms
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Changes in one browser broadcast instantaneously to all peers in the same project room,
                updating Kanban columns, comments, and member rosters with sub-100ms latency.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                Real-Time Audit Trail
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Complete traceability with timestamped activity logs recording task creations, column
                transitions, assignee updates, and team modifications.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack Bar */}
        <div className="mt-20 rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-sm backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Core Technology Stack
              </p>
              <h4 className="mt-1 text-lg font-bold text-slate-900">
                PostgreSQL 18 • Express • TypeScript • Prisma • Socket.IO v4 • Next.js 16
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all"
              >
                <span>Launch Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
