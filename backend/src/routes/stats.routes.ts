import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { getStatsSchema } from "../schemas/stats.schema.js";
import * as statsController from "../controllers/stats.controller.js";

const router = Router();

router.get(
  "/",
  protect,
  validate(getStatsSchema),
  asyncHandler(statsController.getStats)
);

export default router;
