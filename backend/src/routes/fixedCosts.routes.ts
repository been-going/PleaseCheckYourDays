import { Router } from "express";
import * as fixedCostsController from "../controllers/fixedCosts.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.get("/", asyncHandler(fixedCostsController.getFixedCosts));
router.post("/", asyncHandler(fixedCostsController.addFixedCost));
router.delete("/:id", asyncHandler(fixedCostsController.deleteFixedCost));

export default router;
