import { Router } from "express";
import * as templatesController from "../controllers/templates.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.get("/", asyncHandler(templatesController.getActiveTemplates));
router.get("/all", asyncHandler(templatesController.getAllTemplates));
router.get("/trash", asyncHandler(templatesController.getTrash));
router.post("/", asyncHandler(templatesController.createTemplate));
router.patch("/reorder", asyncHandler(templatesController.reorderTemplates));
router.put("/:id", asyncHandler(templatesController.updateTemplate));
router.delete("/:id", asyncHandler(templatesController.deleteTemplate));
router.post("/:id/restore", asyncHandler(templatesController.restoreTemplate));
router.delete(
  "/:id/permanent",
  asyncHandler(templatesController.permanentDelete)
);

export default router;
