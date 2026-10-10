import { Router } from "express";
import { SystemRole, ProjectRole } from "@prisma/client";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  toggleArchiveProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getProjectActivity,
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "../controllers/projectController";
import {
  getTasksForProject,
  createTask,
  createTaskSchema,
} from "../controllers/taskController";
import { authenticate, requireSystemRole, requireProjectRole } from "../middleware/auth";

import { validateBody } from "../middleware/validate";

const router = Router();

router.use(authenticate);

// Global Project Queries & Creation
router.get("/", getProjects);
router.post("/", requireSystemRole(SystemRole.ADMIN), validateBody(createProjectSchema), createProject);

// Single Project Operations
router.get("/:id", requireProjectRole([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_MEMBER, ProjectRole.VIEWER]), getProjectById);
router.patch("/:id", requireProjectRole([ProjectRole.PROJECT_MANAGER]), validateBody(updateProjectSchema), updateProject);
router.patch("/:id/archive", requireProjectRole([ProjectRole.PROJECT_MANAGER]), toggleArchiveProject);
router.delete("/:id", requireSystemRole(SystemRole.ADMIN), deleteProject);

// Team Member Management
router.get("/:id/members", requireProjectRole([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_MEMBER, ProjectRole.VIEWER]), getProjectMembers);
router.post("/:id/members", requireProjectRole([ProjectRole.PROJECT_MANAGER]), validateBody(addMemberSchema), addProjectMember);
router.patch("/:id/members/:userId", requireProjectRole([ProjectRole.PROJECT_MANAGER]), validateBody(updateMemberRoleSchema), updateProjectMemberRole);
router.delete("/:id/members/:userId", requireProjectRole([ProjectRole.PROJECT_MANAGER]), removeProjectMember);

// Project Tasks
router.get("/:id/tasks", requireProjectRole([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_MEMBER, ProjectRole.VIEWER]), getTasksForProject);
router.post("/:id/tasks", requireProjectRole([ProjectRole.PROJECT_MANAGER]), validateBody(createTaskSchema), createTask);

// Activity Log
router.get("/:id/activity", requireProjectRole([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_MEMBER, ProjectRole.VIEWER]), getProjectActivity);


export default router;
