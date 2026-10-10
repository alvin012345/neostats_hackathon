import { Router } from "express";
import {
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../controllers/taskController";
import {
  getCommentsForTask,
  createComment,
  createCommentSchema,
} from "../controllers/commentController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(authenticate);

router.get("/:id", getTaskById);
router.patch("/:id", validateBody(updateTaskSchema), updateTask);
router.patch("/:id/status", validateBody(updateTaskStatusSchema), updateTaskStatus);
router.delete("/:id", deleteTask);

// Comments nested under tasks
router.get("/:id/comments", getCommentsForTask);
router.post("/:id/comments", validateBody(createCommentSchema), createComment);

export default router;

