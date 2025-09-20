// e:/pleaseCheckYourDays/backend/src/routes/daily.routes.ts
import { Router } from "express";
import * as tasksController from "../controllers/tasks.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  upsertTaskFromTemplateSchema,
  upsertTaskNoteSchema,
} from "../schemas/tasks.schema.js";

const router = Router();
router.use(protect);

// 프론트엔드의 POST /api/daily/check 요청을 처리합니다.
router.post(
  "/check",
  validate(upsertTaskFromTemplateSchema),
  asyncHandler(tasksController.upsertTaskFromTemplate)
);

// 프론트엔드의 POST /api/daily/note 요청을 처리합니다.
router.post(
  "/note",
  validate(upsertTaskNoteSchema),
  asyncHandler(tasksController.upsertTaskNote)
);

export default router;
