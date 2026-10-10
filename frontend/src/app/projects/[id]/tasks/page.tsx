"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { Project, ProjectMember } from "../../../../types";
import { api } from "../../../../lib/api";
import { ProjectHeader } from "../../../../components/ProjectHeader";
import { KanbanBoard } from "../../../../components/KanbanBoard";
import { AlertCircle } from "lucide-react";

export default function ProjectTasksPage() {
  const urlParams = useParams();
  const id = urlParams?.id as string;
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const currentMember = members.find((m) => m.userId === user?.id);
  const isProjectManager = currentMember?.role === "PROJECT_MANAGER";
  const canManageProject = isAdmin || isProjectManager;

  const loadProjectData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projRes, membersRes] = await Promise.all([
        api.get<{ data: Project }>(`/projects/${id}`),
        api.get<{ data: ProjectMember[] }>(`/projects/${id}/members`),
      ]);
      setProject(projRes.data);
      setMembers(membersRes.data || []);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Project Navigation Header */}
      <ProjectHeader
        project={project}
        activeTab="tasks"
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

      {/* Kanban Board */}
      <KanbanBoard
        projectId={id}
        members={members}
        isArchived={project.isArchived}
      />
    </div>
  );
}
