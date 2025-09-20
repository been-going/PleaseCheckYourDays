import { Router } from "express";
import * as fixedCostsController from "../controllers/fixedCosts.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  addFixedCostSchema,
  deleteFixedCostSchema,
} from "../schemas/fixedCosts.schema.js";

const router = Router();
router.use(protect);

router.get("/", asyncHandler(fixedCostsController.getFixedCosts));
router.post(
  "/",
  validate(addFixedCostSchema),
  asyncHandler(fixedCostsController.addFixedCost)
);
router.delete(
  "/:id",
  validate(deleteFixedCostSchema),
  asyncHandler(fixedCostsController.deleteFixedCost)
);

export default router;
