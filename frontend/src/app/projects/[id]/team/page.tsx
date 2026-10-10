"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { Project, ProjectMember, ProjectRole } from "../../../../types";
import { api } from "../../../../lib/api";
import { ProjectHeader } from "../../../../components/ProjectHeader";
import {
  Users,
  UserPlus,
  Trash2,
  AlertCircle,
  X,
  ShieldCheck,
  Code2,
  Eye,
} from "lucide-react";

import { useSocket } from "../../../../context/SocketContext";

export default function ProjectTeamPage() {
  const urlParams = useParams();
  const id = urlParams?.id as string;
  const { user, isAdmin } = useAuth();
  const { socket, reconnectCount, joinProject, leaveProject } = useSocket();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("TEAM_MEMBER");

  useEffect(() => {
    if (id) {
      loadTeamData();
      joinProject(id);
    }
    return () => {
      if (id) leaveProject(id);
    };
  }, [id, reconnectCount, joinProject, leaveProject]);

  useEffect(() => {
    if (!socket) return;
    const handleMemberUpdated = () => {
      loadTeamData();
    };
    socket.on("member:updated", handleMemberUpdated);
    return () => {
      socket.off("member:updated", handleMemberUpdated);
    };
  }, [socket]);

  const currentMember = members.find((m) => m.userId === user?.id);
  const isProjectManager = currentMember?.role === "PROJECT_MANAGER";
  const canManageProject = isAdmin || isProjectManager;

  const loadTeamData = async () => {
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
      setErrorMessage(err.message || "Failed to load team data");
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

  const openAddMemberModal = async () => {
    try {
      if (isAdmin) {
        const usersRes = await api.get<{ data: any[] }>("/users");
        setAllUsers(usersRes.data || []);
      }
      setShowAddMemberModal(true);
    } catch (err) {
      console.warn("Could not fetch user list:", err);
      setShowAddMemberModal(true);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      const res = await api.post<{ data: ProjectMember }>(`/projects/${id}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setMembers((prev) => [...prev, res.data]);
      setShowAddMemberModal(false);
      setSelectedUserId("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member? Any tasks assigned to them will be set to unassigned.")) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove member");
    }
  };

  const handleChangeRole = async (userId: string, newRole: ProjectRole) => {
    try {
      const res = await api.patch<{ data: ProjectMember }>(`/projects/${id}/members/${userId}`, {
        role: newRole,
      });
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data : m)));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to change role");
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
        activeTab="team"
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

      {/* Team Roster Content */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Project Team & Roles</h3>
            <p className="text-xs text-zinc-500">
              Users assigned to this workspace with role-based access permissions.
            </p>
          </div>

          {canManageProject && (
            <button
              onClick={openAddMemberModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all self-start sm:self-auto"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Member</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {members.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">No members assigned yet</div>
          ) : (
            members.map((m) => {
              const isUserSelf = m.userId === user?.id;

              return (
                <div key={m.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-xs font-bold text-white shadow-xs">
                      {m.user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">{m.user.name}</p>
                        {isUserSelf && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">{m.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {canManageProject ? (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.userId, e.target.value as ProjectRole)}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        >
                          <option value="PROJECT_MANAGER">Project Manager</option>
                          <option value="TEAM_MEMBER">Team Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>

                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {m.role === "PROJECT_MANAGER"
                          ? "Project Manager"
                          : m.role === "TEAM_MEMBER"
                          ? "Team Member"
                          : "Viewer"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Add Project Member</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="rounded-xl p-1 text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Select User
                </label>
                {allUsers.length > 0 ? (
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="">-- Choose User --</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter user UUID..."
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                >
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-md"
                >
                  Add to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
