// e:/pleaseCheckYourDays/backend/src/routes/dashboard.routes.ts
import { Router } from "express";
import { getRoutineStats } from "../controllers/dashboard.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// GET /api/dashboard/routines
router.get("/routines", protect, asyncHandler(getRoutineStats));

export default router;
