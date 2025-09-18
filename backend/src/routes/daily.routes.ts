// e:/pleaseCheckYourDays/backend/src/routes/daily.routes.ts
import { Router } from "express";
import * as tasksController from "../controllers/tasks.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

// 프론트엔드의 POST /api/daily/check 요청을 처리합니다.
router.post("/check", asyncHandler(tasksController.upsertTaskFromTemplate));

// 프론트엔드의 POST /api/daily/note 요청을 처리합니다.
router.post("/note", asyncHandler(tasksController.upsertTaskNote));

export default router;
