"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Project, Task } from "../../types";
import { api } from "../../lib/api";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const res = await api.get<{ data: Project[] }>("/projects");
      setProjects(res.data || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p._count?.tasks || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Shield className="h-3.5 w-3.5" />
            <span>
              Role:{" "}
              {user.systemRole === "ADMIN" || user.email === "admin@neostats.com"
                ? "System Administrator"
                : user.email === "pm@neostats.com"
                ? "Project Manager"
                : user.email === "viewer@neostats.com"
                ? "Viewer (Read-Only)"
                : "Team Member"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            Real-time project management dashboard. All updates sync instantly across sessions.
          </p>
        </div>

        <Link
          href="/projects"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-xs hover:bg-blue-50 active:scale-[0.98] transition-all shrink-0"
        >
          <span>View All Projects</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Metrics Row */}
      {dataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
              </div>
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="group rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Active Projects
              </span>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
              {totalProjects}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Accessible in your workspace</p>
          </div>

          <div className="group rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Tasks
              </span>
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
              {totalTasks}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Across all accessible projects</p>
          </div>

          <div className="group rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Real-Time Collaboration
              </span>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Live
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Socket.IO room synchronization</p>
          </div>
        </div>
      )}

      {/* Projects List Section */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Your Projects</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Select a project to enter its real-time Kanban board</p>
          </div>
          <Link
            href="/projects"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 active:scale-[0.98] transition-all"
          >
            Explore all →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataLoading ? (
            <>
              {[1, 2].map((idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200/80 p-5 space-y-3 dark:border-zinc-800 animate-pulse"
                >
                  <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded pt-3" />
                </div>
              ))}
            </>
          ) : projects.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-zinc-400">
              No projects assigned yet.
            </div>
          ) : (
            projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400/80 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                      {p.name}
                    </h3>
                    {p.isArchived && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                        Archived
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-400 dark:border-zinc-800">
                  <span className="tabular-nums font-medium">{p._count?.tasks || 0} tasks</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    Enter Project →
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
