"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { Project } from "../../types";
import { api } from "../../lib/api";
import { Plus, FolderKanban, Archive, ArrowRight, AlertCircle, X } from "lucide-react";

export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await api.get<{ data: Project[] }>("/projects");
      setProjects(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await api.post<{ data: Project }>("/projects", {
        name: newProjectName,
        description: newProjectDesc || null,
      });
      setProjects((prev) => [res.data, ...prev]);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create project");
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.patch<{ data: Project }>(`/projects/${projectId}/archive`);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, isArchived: res.data.isArchived } : p))
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle archive status");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Projects Directory</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Browse and manage collaborative project workspaces.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 py-16 text-center text-sm text-zinc-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-sm text-zinc-400">
            No projects available. {isAdmin && "Create one to get started!"}
          </div>
        ) : (
          projects.map((project) => {
            const isPM = project.members?.some(
              (m) => m.userId === user?.id && m.role === "PROJECT_MANAGER"
            );
            const canManage = isAdmin || isPM;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs transition-all hover:border-blue-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <FolderKanban className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-2">
                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleArchive(e, project.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
                          title={project.isArchived ? "Unarchive project" : "Archive project"}
                        >
                          <Archive className="h-3 w-3" />
                          <span>{project.isArchived ? "Unarchive" : "Archive"}</span>
                        </button>
                      )}
                      {project.isArchived ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-400">
                          <Archive className="h-3 w-3" />
                          Archived
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                <h3 className="mt-4 font-bold text-base text-zinc-900 group-hover:text-blue-600 dark:text-white transition-colors">
                  {project.name}
                </h3>

                {project.description && (
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs font-semibold text-zinc-400 dark:border-zinc-800">
                <span>{project._count?.tasks || 0} tasks</span>
                <span className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                  Enter Board
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })
      )}
    </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create New Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Mobile Application Redesign"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Project goals, scope, and objectives..."
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
