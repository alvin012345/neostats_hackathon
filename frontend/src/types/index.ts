export type SystemRole = "ADMIN" | "USER";
export type ProjectRole = "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  email: string;
  name: string;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  _count?: {
    tasks: number;
    members?: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  version: number;
  creatorId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  creator?: User;
  project?: {
    id: string;
    name: string;
    isArchived?: boolean;
  };
  _count?: {
    comments: number;
  };
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface ActivityLog {
  id: string;
  userId: string;
  projectId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}
