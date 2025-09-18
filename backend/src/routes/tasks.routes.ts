// e:/pleaseCheckYourDays/backend/src/routes/tasks.routes.ts
import { Router } from "express";
import * as tasksController from "../controllers/tasks.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.get("/", asyncHandler(tasksController.getDailyTasks));
router.get("/range", asyncHandler(tasksController.getTasksForRange));
router.post("/oneoff", asyncHandler(tasksController.addOneoff));
router.patch("/:id", asyncHandler(tasksController.updateTask));
router.delete("/:id", asyncHandler(tasksController.deleteTask));

export default router;
