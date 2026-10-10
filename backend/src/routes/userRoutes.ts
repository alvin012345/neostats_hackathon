import { Router } from "express";
import { SystemRole } from "@prisma/client";
import { getUsers, createUser, deactivateUser, deleteUser, createUserSchema } from "../controllers/userController";
import { authenticate, requireSystemRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

// All user management routes require authentication and ADMIN system role
router.use(authenticate, requireSystemRole(SystemRole.ADMIN));

router.get("/", getUsers);
router.post("/", validateBody(createUserSchema), createUser);
router.patch("/:id/deactivate", deactivateUser);
router.delete("/:id", deleteUser);

export default router;
