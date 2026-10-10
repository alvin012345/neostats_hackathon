"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { Task, Comment, ProjectMember, TaskStatus, TaskPriority } from "../../../types";
import { api, ApiError } from "../../../lib/api";
import { ConflictModal } from "../../../components/ConflictModal";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  AlertCircle,
  FolderKanban,
  User as UserIcon,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

export default function StandaloneTaskPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { socket, reconnectCount, joinProject, leaveProject } = useSocket();

  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("");

  // OCC Conflict state
  const [conflictTask, setConflictTask] = useState<Task | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadTaskData();
    }
  }, [id, reconnectCount]);

  useEffect(() => {
    if (task?.projectId) {
      joinProject(task.projectId);
    }
    return () => {
      if (task?.projectId) {
        leaveProject(task.projectId);
      }
    };
  }, [task?.projectId, joinProject, leaveProject]);

  // Real-time socket events
  useEffect(() => {
    if (!socket || !id) return;

    const handleTaskUpdated = (updatedTask: Task) => {
      if (updatedTask.id === id) {
        setTask(updatedTask);
        setTitle(updatedTask.title);
        setDescription(updatedTask.description || "");
        setStatus(updatedTask.status);
        setPriority(updatedTask.priority);
        setAssigneeId(updatedTask.assigneeId || "");
      }
    };

    const handleCommentCreated = (comment: Comment) => {
      if (comment.taskId === id) {
        setComments((prev) => {
          if (prev.some((c) => c.id === comment.id)) return prev;
          return [...prev, comment];
        });
      }
    };

    const handleCommentDeleted = (data: { commentId: string; taskId: string }) => {
      if (data.taskId === id) {
        setComments((prev) => prev.filter((c) => c.id !== data.commentId));
      }
    };

    socket.on("task:updated", handleTaskUpdated);
    socket.on("comment:created", handleCommentCreated);
    socket.on("comment:deleted", handleCommentDeleted);

    return () => {
      socket.off("task:updated", handleTaskUpdated);
      socket.off("comment:created", handleCommentCreated);
      socket.off("comment:deleted", handleCommentDeleted);
    };
  }, [socket, id]);

  const loadTaskData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const taskRes = await api.get<{ data: Task }>(`/tasks/${id}`);
      const t = taskRes.data;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description || "");
      setStatus(t.status);
      setPriority(t.priority);
      setAssigneeId(t.assigneeId || "");

      // Load comments and project members in parallel
      const [commRes, memRes] = await Promise.all([
        api.get<{ data: Comment[] }>(`/tasks/${id}/comments`),
        api.get<{ data: ProjectMember[] }>(`/projects/${t.projectId}/members`).catch(() => ({ data: [] })),
      ]);

      setComments(commRes.data || []);
      setMembers(memRes.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load task details");
    } finally {
      setIsLoading(false);
    }
  };

  const isProjectManager = members.some((m) => m.userId === user?.id && m.role === "PROJECT_MANAGER");
  const canManage = isAdmin || isProjectManager;
  const isArchived = Boolean(task?.project?.isArchived);

  const handleSave = async (forceOverwrite: boolean = false) => {
    if (!task) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      expectedVersion: forceOverwrite && conflictTask ? conflictTask.version : task.version,
    };

    try {
      const res = await api.patch<{ message: string; data: Task }>(`/tasks/${id}`, payload);
      setTask(res.data);
      setShowConflictModal(false);
      setSuccessMessage("Task changes saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
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
      const res = await api.post<{ data: Comment }>(`/tasks/${id}/comments`, {
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
    if (!confirm("Are you sure you want to permanently delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      if (task?.projectId) {
        router.push(`/projects/${task.projectId}/tasks`);
      } else {
        router.push("/projects");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete task");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-4xl py-24 text-center">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Task not found</h2>
        <p className="mt-2 text-xs text-zinc-500">The task does not exist or you lack project permissions to view it.</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/projects" className="hover:text-blue-600">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${task.projectId}`} className="hover:text-blue-600">
            {task.project?.name || "Project"}
          </Link>
          <span>/</span>
          <Link href={`/projects/${task.projectId}/tasks`} className="hover:text-blue-600">
            Tasks
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-white font-bold">#{task.id.slice(0, 8)}</span>
        </div>

        <Link
          href={`/projects/${task.projectId}/tasks`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Kanban Board
        </Link>
      </div>

      {isArchived && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>This task belongs to an archived project and is read-only. Modifications and comments are blocked.</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Task Editor Card */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              TASK #{task.id.slice(0, 8)}
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Version {task.version}
            </span>
          </div>

          <div className="text-right text-[11px] text-zinc-400">
            Created: {new Date(task.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Title
          </label>
          <input
            type="text"
            disabled={isArchived}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-base font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>

        {/* Metadata Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Status
            </label>
            <select
              disabled={isArchived}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Priority
            </label>
            <select
              disabled={isArchived}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Assignee
            </label>
            <select
              disabled={isArchived}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
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
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Description
          </label>
          <textarea
            rows={5}
            disabled={isArchived}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of deliverables, specs, and requirements..."
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {canManage && !isArchived ? (
            <button
              type="button"
              onClick={handleDeleteTask}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </button>
          ) : <div />}

          <button
            type="button"
            disabled={isSaving || isArchived}
            onClick={() => handleSave(false)}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Comments Thread Card */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Discussion & Comments ({comments.length})
          </h3>
        </div>

        {!isArchived && (
          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment... (use @name to mention a teammate)"
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </button>
          </form>
        )}

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">No comments yet. Start the conversation!</p>
          ) : (
            comments.map((comment) => {
              const canDeleteThisComment =
                !isArchived && (comment.userId === user?.id || canManage);

              return (
                <div key={comment.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {comment.user.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>

                  {canDeleteThisComment && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="rounded p-1 text-zinc-400 hover:text-red-500 transition-colors"
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

      {/* OCC Conflict Modal */}
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
    </div>
  );
}
