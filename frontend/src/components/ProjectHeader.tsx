"use client";

import React from "react";
import Link from "next/link";
import { Project } from "../types";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Activity,
  Archive,
  Trash2,
} from "lucide-react";

interface ProjectHeaderProps {
  project: Project;
  activeTab: "overview" | "tasks" | "team" | "activity";
  membersCount: number;
  canManageProject: boolean;
  isAdmin: boolean;
  onToggleArchive: () => void;
  onDeleteProject?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  activeTab,
  membersCount,
  canManageProject,
  isAdmin,
  onToggleArchive,
  onDeleteProject,
}) => {
  const tabs = [
    { key: "overview", label: "Overview", href: `/projects/${project.id}`, icon: LayoutDashboard },
    { key: "tasks", label: "Tasks (Board)", href: `/projects/${project.id}/tasks`, icon: Kanban },
    { key: "team", label: `Team (${membersCount})`, href: `/projects/${project.id}/team`, icon: Users },
    { key: "activity", label: "Activity Audit", href: `/projects/${project.id}/activity`, icon: Activity },
  ];

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {project.name}
            </h1>
            {project.isArchived ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Archived (Read-Only)
              </span>
            ) : (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            )}
          </div>
          {project.description && (
            <p className="mt-1 text-xs text-zinc-500 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Project Management Actions */}
        <div className="flex items-center gap-2">
          {canManageProject && (
            <button
              onClick={onToggleArchive}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{project.isArchived ? "Unarchive" : "Archive"}</span>
            </button>
          )}

          {isAdmin && onDeleteProject && (
            <button
              onClick={onDeleteProject}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-6 flex border-b border-zinc-200 dark:border-zinc-800 gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
