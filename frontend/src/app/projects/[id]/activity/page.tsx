"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { useSocket } from "../../../../context/SocketContext";
import { Project, ProjectMember, ActivityLog } from "../../../../types";
import { api } from "../../../../lib/api";
import { ProjectHeader } from "../../../../components/ProjectHeader";
import {
  Activity,
  Clock,
  AlertCircle,
  Radio,
  Filter,
} from "lucide-react";

export default function ProjectActivityPage() {
  const urlParams = useParams();
  const id = urlParams?.id as string;
  const { user, isAdmin } = useAuth();
  const { socket, reconnectCount, joinProject, leaveProject } = useSocket();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadActivityData();
      joinProject(id);
    }

    return () => {
      if (id) leaveProject(id);
    };
  }, [id, reconnectCount, joinProject, leaveProject]);

  // Real-time live activity listener via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (activity: ActivityLog) => {
      setActivityLogs((prev) => {
        if (prev.some((a) => a.id === activity.id)) return prev;
        return [activity, ...prev];
      });
    };

    socket.on("activity:created", handleNewActivity);
    socket.on("activity_created", handleNewActivity);

    return () => {
      socket.off("activity:created", handleNewActivity);
      socket.off("activity_created", handleNewActivity);
    };
  }, [socket]);

  const currentMember = members.find((m) => m.userId === user?.id);
  const isProjectManager = currentMember?.role === "PROJECT_MANAGER";
  const canManageProject = isAdmin || isProjectManager;

  const loadActivityData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projRes, membersRes, actRes] = await Promise.all([
        api.get<{ data: Project }>(`/projects/${id}`),
        api.get<{ data: ProjectMember[] }>(`/projects/${id}/members`),
        api.get<{ data: ActivityLog[] }>(`/projects/${id}/activity?limit=50`),
      ]);
      setProject(projRes.data);
      setMembers(membersRes.data || []);
      setActivityLogs(actRes.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load audit trail");
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
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      router.push("/projects");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete project");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Project not found</h2>
        <p className="mt-1 text-xs text-zinc-500">The requested workspace does not exist or you lack permissions.</p>
      </div>
    );
  }

  const filteredLogs = selectedActionFilter === "ALL"
    ? activityLogs
    : activityLogs.filter((log) => log.action.toLowerCase() === selectedActionFilter.toLowerCase());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Project Navigation Header */}
      <ProjectHeader
        project={project}
        activeTab="activity"
        membersCount={members.length}
        canManageProject={canManageProject}
        isAdmin={isAdmin}
        onToggleArchive={handleToggleArchive}
        onDeleteProject={handleDeleteProject}
      />

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Activity Timeline Card */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Audit Trail Timeline</h3>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Complete chronological audit trail of all project events, task lifecycle mutations, and comments.
            </p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <option value="ALL">All Actions ({activityLogs.length})</option>
              <option value="project_created">project_created</option>
              <option value="member_added">member_added</option>
              <option value="task_created">task_created</option>
              <option value="task_assigned">task_assigned</option>
              <option value="status_changed">status_changed</option>
              <option value="comment_added">comment_added</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">No activity recorded for this filter</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-xs text-zinc-900 dark:text-white">
                      <strong>{log.user.name}</strong> performed{" "}
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {log.action}
                      </code>{" "}
                      on <span className="text-zinc-500 font-semibold">{log.entityType.toLowerCase()}</span>
                    </p>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1.5 text-[11px] text-zinc-500 rounded-xl bg-zinc-50 p-2 dark:bg-zinc-950/60 font-mono">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
