// e:/pleaseCheckYourDays/backend/src/routes/dashboard.routes.ts
import { Router } from "express";
import { getRoutineStats } from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/dashboard/routines
router.get("/routines", protect, asyncHandler(getRoutineStats));

export default router;
