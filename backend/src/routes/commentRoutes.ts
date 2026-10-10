import { Router } from "express";
import { deleteComment } from "../controllers/commentController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.delete("/:id", deleteComment);

export default router;
