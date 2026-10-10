"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  User as UserIcon,
  Eye,
  CheckCircle2,
  Sparkles,
  ListTodo,
} from "lucide-react";
import { Task, TaskStatus, TaskPriority, ProjectMember } from "../types";
import { api, ApiError } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { TaskModal } from "./TaskModal";

interface KanbanBoardProps {
  projectId: string;
  members: ProjectMember[];
  isArchived: boolean;
}

const COLUMNS: Array<{ id: TaskStatus; label: string; accent: string; bg: string }> = [
  { id: "TODO", label: "To Do", accent: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
  { id: "IN_PROGRESS", label: "In Progress", accent: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  { id: "IN_REVIEW", label: "In Review", accent: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
  { id: "DONE", label: "Done", accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
];

const COLUMN_EMPTY_STATES: Record<TaskStatus, { message: string; subtext: string; icon: React.ComponentType<{ className?: string }> }> = {
  TODO: {
    message: "No tasks to do yet",
    subtext: "Create a new task to get this sprint started.",
    icon: ListTodo,
  },
  IN_PROGRESS: {
    message: "No tasks in progress",
    subtext: "Advance a task from To Do when work starts.",
    icon: Sparkles,
  },
  IN_REVIEW: {
    message: "No tasks in review yet",
    subtext: "Tasks ready for QA or review will appear here.",
    icon: Eye,
  },
  DONE: {
    message: "No tasks completed yet",
    subtext: "Completed tasks will be archived here.",
    icon: CheckCircle2,
  },
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; cls: string; isUrgent?: boolean }> = {
  LOW: {
    label: "Low",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
  },
  MEDIUM: {
    label: "Medium",
    cls: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  },
  HIGH: {
    label: "High",
    cls: "bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
  },
  URGENT: {
    label: "Urgent",
    cls: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    isUrgent: true,
  },
};

function upsertTask(list: Task[], incoming: Task): Task[] {
  const index = list.findIndex((t) => t.id === incoming.id);
  if (index >= 0) {
    const copy = [...list];
    copy[index] = { ...copy[index], ...incoming };
    return copy;
  }
  return [incoming, ...list];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, members, isArchived }) => {
  const { user, isAdmin } = useAuth();
  const { socket, joinProject, leaveProject, reconnectCount } = useSocket();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine user permissions for this workspace
  const currentMember = members.find((m) => m.userId === user?.id);
  const isViewer = !isAdmin && (user?.email === "viewer@neostats.com" || currentMember?.role === "VIEWER");

  // Subscribe to project socket room on mount and re-subscribe/re-fetch on reconnect
  useEffect(() => {
    joinProject(projectId);
    loadTasks();

    if (!socket) return;

    // Real-time Event Listeners with idempotent upsert
    const handleTaskCreated = (newTask: Task) => {
      setTasks((prev) => upsertTask(prev, newTask));
    };

    const handleTaskUpdated = (updatedTask: Task) => {
      setTasks((prev) => upsertTask(prev, updatedTask));
    };

    const handleStatusChanged = (payload: { taskId: string; status: TaskStatus; version: number }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.taskId
            ? { ...t, status: payload.status, version: payload.version }
            : t
        )
      );
    };

    const handleTaskDeleted = (payload: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:status_changed", handleStatusChanged);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:status_changed", handleStatusChanged);
      socket.off("task:deleted", handleTaskDeleted);
      leaveProject(projectId);
    };
  }, [projectId, socket, reconnectCount, joinProject, leaveProject]);

  const loadTasks = async () => {
    try {
      const res = await api.get<{ data: Task[] }>(`/projects/${projectId}/tasks`);
      const uniqueMap = new Map<string, Task>();
      (res.data || []).forEach((t) => uniqueMap.set(t.id, t));
      setTasks(Array.from(uniqueMap.values()));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load project tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await api.post<{ data: Task }>(`/projects/${projectId}/tasks`, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        status: "TODO",
      });
      setTasks((prev) => upsertTask(prev, res.data));
      setNewTaskTitle("");
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create task");
    }
  };

  const handleMoveStatus = async (task: Task, nextStatus: TaskStatus) => {
    try {
      const res = await api.patch<{ data: Task }>(`/tasks/${task.id}/status`, {
        status: nextStatus,
        expectedVersion: task.version,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409 && err.data?.currentTask) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? err.data.currentTask : t)));
        setErrorMessage("Concurrency Conflict (HTTP 409): Task was updated by another collaborator. Synchronized latest state.");
      } else {
        setErrorMessage(err.message || "Failed to update status");
      }
    }
  };

  // Guarantee absolute uniqueness of task IDs when rendering
  const uniqueTasks = Array.from(new Map(tasks.map((t) => [t.id, t])).values());

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Live Kanban Workflow
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Socket.IO Live
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time drag & status advancement with atomic optimistic concurrency control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isViewer ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Viewing Mode (Read-Only)</span>
            </div>
          ) : !isArchived ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Kanban Grid or Skeleton Loader */}
      {isLoading ? (
        <div className="flex lg:grid lg:grid-cols-4 gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 flex-1 snap-start rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-4 min-h-[520px] dark:border-zinc-800/80 dark:bg-zinc-900/40 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/70 dark:border-zinc-800">
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                <div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-zinc-200/80 bg-white p-4 space-y-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 animate-pulse"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-14 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-4 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      <div className="h-4 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex lg:grid lg:grid-cols-4 gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth">
          {COLUMNS.map((col) => {
            const colTasks = uniqueTasks.filter((t) => t.status === col.id);
            const emptyState = COLUMN_EMPTY_STATES[col.id];
            const EmptyIcon = emptyState.icon;

            return (
              <div
                key={col.id}
                className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 flex-1 snap-start flex flex-col rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-4 min-h-[520px] dark:border-zinc-800/80 dark:bg-zinc-900/40"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200/70 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${col.accent}`}>
                      {col.label}
                    </h3>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200/80 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 tabular-nums">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task Cards or Empty State */}
                <div className="mt-4 flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="flex h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200/90 dark:border-zinc-800/90 p-5 text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 mb-2">
                        <EmptyIcon className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {emptyState.message}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
                        {emptyState.subtext}
                      </p>
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const priorityInfo = PRIORITY_BADGES[t.priority];
                      const canEdit = !isArchived && !isViewer;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className="group relative cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400/80 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityInfo.cls}`}
                            >
                              {priorityInfo.isUrgent && (
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600" />
                                </span>
                              )}
                              {priorityInfo.label}
                            </span>
                            <span
                              className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 tabular-nums"
                              title={`Optimistic Concurrency Version ${t.version}`}
                            >
                              v{t.version}
                            </span>
                          </div>

                          <h4 className="mt-2.5 text-xs font-semibold text-zinc-900 leading-snug group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                            {t.title}
                          </h4>

                          {t.description && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                              {t.description}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-400 dark:border-zinc-800">
                            {t.assignee ? (
                              <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-[10px] text-white font-bold">
                                  {t.assignee.name.charAt(0)}
                                </span>
                                <span>{t.assignee.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-zinc-400 font-medium">
                                <UserIcon className="h-3 w-3" />
                                <span>Unassigned</span>
                              </div>
                            )}

                            {t._count?.comments ? (
                              <div className="flex items-center gap-1 font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                                <MessageSquare className="h-3 w-3" />
                                <span>{t._count.comments}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Bidirectional Status Controls */}
                          {canEdit && (
                            <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2 dark:border-zinc-800">
                              {/* Back Button */}
                              {col.id !== "TODO" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prevStatus: TaskStatus =
                                      col.id === "DONE"
                                        ? "IN_REVIEW"
                                        : col.id === "IN_REVIEW"
                                        ? "IN_PROGRESS"
                                        : "TODO";
                                    handleMoveStatus(t, prevStatus);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors active:scale-[0.98]"
                                  title="Move back one status"
                                >
                                  <ArrowLeft className="h-2.5 w-2.5" />
                                  <span>Back</span>
                                </button>
                              ) : <div />}

                              {/* Advance Button */}
                              {col.id !== "DONE" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus: TaskStatus =
                                      col.id === "TODO"
                                        ? "IN_PROGRESS"
                                        : col.id === "IN_PROGRESS"
                                        ? "IN_REVIEW"
                                        : "DONE";
                                    handleMoveStatus(t, nextStatus);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors active:scale-[0.98]"
                                  title="Advance to next status"
                                >
                                  <span>Advance</span>
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Completed</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement WebSocket heartbeat reconnection"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Edit Modal */}
      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          projectId={projectId}
          members={members}
          isArchived={isArchived}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => upsertTask(prev, updated));
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            setSelectedTaskId(null);
          }}
        />
      )}
    </div>
  );
};

