// e:/pleaseCheckYourDays/backend/src/routes/tasks.routes.ts
import { Router } from "express";
import * as tasksController from "../controllers/tasks.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  getDailyTasksSchema,
  getTasksForRangeSchema,
  addOneoffSchema,
  updateTaskSchema,
  taskIdParamSchema,
} from "../schemas/tasks.schema.js";

const router = Router();
router.use(protect);

router.get(
  "/",
  validate(getDailyTasksSchema),
  asyncHandler(tasksController.getDailyTasks)
);
router.get(
  "/range",
  validate(getTasksForRangeSchema),
  asyncHandler(tasksController.getTasksForRange)
);
router.post(
  "/oneoff",
  validate(addOneoffSchema),
  asyncHandler(tasksController.addOneoff)
);
router.patch(
  "/:id",
  validate(updateTaskSchema),
  asyncHandler(tasksController.updateTask)
);
router.delete(
  "/:id",
  validate(taskIdParamSchema),
  asyncHandler(tasksController.deleteTask)
);

export default router;
