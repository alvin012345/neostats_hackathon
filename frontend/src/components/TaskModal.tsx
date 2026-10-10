"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Trash2, Clock, CheckCircle2, User as UserIcon, AlertCircle } from "lucide-react";
import { Task, Comment, ProjectMember, TaskStatus, TaskPriority } from "../types";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ConflictModal } from "./ConflictModal";

interface TaskModalProps {
  taskId: string;
  projectId: string;
  members: ProjectMember[];
  isOpen: boolean;
  onClose: () => void;
  isArchived?: boolean;
  onTaskUpdated?: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  taskId,
  projectId,
  members,
  isOpen,
  onClose,
  isArchived: isArchivedProp,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const { user, isAdmin } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form edit states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("");

  // OCC Conflict State
  const [conflictTask, setConflictTask] = useState<Task | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !showConflictModal) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showConflictModal, onClose]);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    }
  }, [isOpen, taskId]);

  const loadTaskDetails = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<{ data: Task }>(`/tasks/${taskId}`);
      const t = res.data;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description || "");
      setStatus(t.status);
      setPriority(t.priority);
      setAssigneeId(t.assigneeId || "");

      // Load comments
      const commentRes = await api.get<{ data: Comment[] }>(`/tasks/${taskId}/comments`);
      setComments(commentRes.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (forceOverwrite: boolean = false) => {
    if (!task) return;
    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      expectedVersion: forceOverwrite && conflictTask ? conflictTask.version : task.version,
    };

    try {
      const res = await api.patch<{ message: string; data: Task }>(`/tasks/${taskId}`, payload);
      setTask(res.data);
      setShowConflictModal(false);
      onTaskUpdated?.(res.data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        // Concurrency Conflict caught!
        console.warn("OCC 409 Conflict:", err.data);
        setConflictTask(err.data.currentTask);
        setShowConflictModal(true);
      } else {
        setErrorMessage(err.message || "Failed to update task");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.post<{ data: Comment }>(`/tasks/${taskId}/comments`, {
        content: newComment,
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to post comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete comment");
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      onTaskDeleted?.(taskId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete task");
    }
  };

  if (!isOpen) return null;

  const isProjectManager = members.some((m) => m.userId === user?.id && m.role === "PROJECT_MANAGER");
  const canManage = isAdmin || isProjectManager;
  const isArchived = Boolean(isArchivedProp || task?.project?.isArchived);
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 p-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 tabular-nums">
                TASK #{taskId.slice(0, 6)}
              </span>
              {task && (
                <span className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Version {task.version}
                </span>
              )}
              {isArchived && (
                <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  Archived (Read-Only)
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 active:scale-[0.98] transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isArchived && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>This project is archived and read-only. Task details, status, and comments cannot be modified.</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-6 py-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            ) : task ? (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Title
                  </label>
                  <input
                    type="text"
                    disabled={isArchived}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-2.5 text-sm font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                {/* Metadata Row: Status, Priority, Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      disabled={isArchived}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Priority
                    </label>
                    <select
                      disabled={isArchived}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Assignee
                    </label>
                    <select
                      disabled={isArchived}
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    disabled={isArchived}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about the task..."
                    className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                {/* Comments Thread */}
                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Comments
                    </h4>
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {comments.length}
                    </span>
                  </div>

                  {!isArchived && (
                    <form onSubmit={handlePostComment} className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment... (use @name to mention team members)"
                        className="flex-1 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Post
                      </button>
                    </form>
                  )}

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="py-4 text-center text-xs text-zinc-400">No comments yet. Start the conversation!</p>
                    ) : (
                      comments.map((comment) => {
                        const canDeleteThisComment =
                          !isArchived && (comment.userId === user?.id || canManage);

                        return (
                          <div
                            key={comment.id}
                            className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/60"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                                  {comment.user.name}
                                </span>
                                <span className="text-[10px] text-zinc-400 tabular-nums">
                                  {new Date(comment.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                {comment.content}
                              </p>
                            </div>

                            {canDeleteThisComment && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-[0.98] transition-all"
                                title="Delete comment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-zinc-100 bg-white/95 p-4 px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
            {canManage && !isArchived ? (
              <button
                type="button"
                onClick={handleDeleteTask}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 active:scale-[0.98] transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || isArchived}
                onClick={() => handleSave(false)}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OCC Concurrency Conflict Resolution Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        serverTask={conflictTask}
        attemptedData={{ title, description, status, priority }}
        onReloadLatest={() => {
          if (conflictTask) {
            setTask(conflictTask);
            setTitle(conflictTask.title);
            setDescription(conflictTask.description || "");
            setStatus(conflictTask.status);
            setPriority(conflictTask.priority);
            setAssigneeId(conflictTask.assigneeId || "");
            setShowConflictModal(false);
          }
        }}
        onForceOverwrite={() => handleSave(true)}
      />
    </>
  );
};
