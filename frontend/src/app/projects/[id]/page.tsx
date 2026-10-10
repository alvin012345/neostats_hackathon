"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { Project, ProjectMember, ActivityLog, Task } from "../../../types";
import { api } from "../../../lib/api";
import { ProjectHeader } from "../../../components/ProjectHeader";
import {
  Kanban,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  FolderKanban,
  ListTodo,
} from "lucide-react";

export default function ProjectOverviewPage() {
  const urlParams = useParams();
  const id = urlParams?.id as string;
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectOverview();
    }
  }, [id]);

  const currentMember = members.find((m) => m.userId === user?.id);
  const isProjectManager = currentMember?.role === "PROJECT_MANAGER";
  const canManageProject = isAdmin || isProjectManager;

  const loadProjectOverview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projRes, membersRes, tasksRes, actRes] = await Promise.all([
        api.get<{ data: Project }>(`/projects/${id}`),
        api.get<{ data: ProjectMember[] }>(`/projects/${id}/members`),
        api.get<{ data: Task[] }>(`/projects/${id}/tasks`),
        api.get<{ data: ActivityLog[] }>(`/projects/${id}/activity`),
      ]);
      setProject(projRes.data);
      setMembers(membersRes.data || []);
      setTasks(tasksRes.data || []);
      setActivityLogs(actRes.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!project) return;
    try {
      const res = await api.patch<{ data: Project }>(`/projects/${id}/archive`);
      setProject(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle archive status");
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to permanently delete this project? All tasks and comments will be erased."))
      return;
    try {
      await api.delete(`/projects/${id}`);
      router.push("/projects");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete project");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 animate-pulse space-y-3">
              <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-6 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Project not found</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">The requested workspace does not exist or you lack permissions.</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const inReviewTasks = tasks.filter((t) => t.status === "IN_REVIEW");
  const doneTasks = tasks.filter((t) => t.status === "DONE");
  const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Project Navigation Header */}
      <ProjectHeader
        project={project}
        activeTab="overview"
        membersCount={members.length}
        canManageProject={canManageProject}
        isAdmin={isAdmin}
        onToggleArchive={handleToggleArchive}
        onDeleteProject={handleDeleteProject}
      />

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <ListTodo className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">{tasks.length}</p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">Completion: {completionRate}%</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">To Do</span>
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">{todoTasks.length}</p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Awaiting start</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">{inProgressTasks.length}</p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Active development</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Done</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">{doneTasks.length}</p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Successfully completed</span>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Team Roster</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">{members.length}</p>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Assigned members</span>
        </div>
      </div>

      {/* Navigation Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href={`/projects/${id}/tasks`}
          className="group rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400/80 dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-150 flex flex-col justify-between active:scale-[0.98]"
        >
          <div>
            <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Kanban className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
              Dedicated Task Board
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Manage tasks across columns, drag & drop status transitions, optimistic concurrency control, and comments.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span>Open Task Board</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href={`/projects/${id}/team`}
          className="group rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-400/80 dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-150 flex flex-col justify-between active:scale-[0.98]"
        >
          <div>
            <div className="inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
              Project Team & Roles
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Manage team membership, assign Project Manager, Team Member, or Viewer roles, and control access permissions.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Manage Team</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href={`/projects/${id}/activity`}
          className="group rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-400/80 dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-150 flex flex-col justify-between active:scale-[0.98]"
        >
          <div>
            <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 transition-colors">
              Project Audit Trail
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Live chronological feed of all project changes, assignments, status updates, and comments via real-time WebSocket sync.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>View Activity Trail</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Recent Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Tasks</h3>
            <Link
              href={`/projects/${id}/tasks`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 active:scale-[0.98] transition-all"
            >
              View all ({tasks.length})
            </Link>
          </div>

          <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">No tasks created yet</p>
            ) : (
              tasks.slice(0, 5).map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-xs font-semibold text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors"
                    >
                      {t.title}
                    </Link>
                    <p className="text-[10px] text-zinc-400 tabular-nums">
                      Assignee: {t.assignee?.name || "Unassigned"} • Version {t.version}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                      t.status === "DONE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                        : t.status === "IN_PROGRESS"
                        ? "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
                        : t.status === "IN_REVIEW"
                        ? "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
                        : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Activity</h3>
            <Link
              href={`/projects/${id}/activity`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 active:scale-[0.98] transition-all"
            >
              Full timeline
            </Link>
          </div>

          <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {activityLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">No activity logged yet</p>
            ) : (
              activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-3 flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-900 dark:text-white leading-snug">
                      <strong>{log.user.name}</strong>{" "}
                      <code className="rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                        {log.action}
                      </code>
                    </p>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
