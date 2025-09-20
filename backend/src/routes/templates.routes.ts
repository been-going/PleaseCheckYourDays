import { Router } from "express";
import * as templatesController from "../controllers/templates.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  createTemplateSchema,
  reorderTemplatesSchema,
  updateTemplateSchema,
  templateIdParamSchema,
} from "../schemas/templates.schema.js";

const router = Router();
router.use(protect);

router.get("/", asyncHandler(templatesController.getActiveTemplates));
router.get("/all", asyncHandler(templatesController.getAllTemplates));
router.get("/trash", asyncHandler(templatesController.getTrash));
router.post(
  "/",
  validate(createTemplateSchema),
  asyncHandler(templatesController.createTemplate)
);
router.patch(
  "/reorder",
  validate(reorderTemplatesSchema),
  asyncHandler(templatesController.reorderTemplates)
);
router.put(
  "/:id",
  validate(updateTemplateSchema),
  asyncHandler(templatesController.updateTemplate)
);
router.delete(
  "/:id",
  validate(templateIdParamSchema),
  asyncHandler(templatesController.deleteTemplate)
);
router.post(
  "/:id/restore",
  validate(templateIdParamSchema),
  asyncHandler(templatesController.restoreTemplate)
);
router.delete(
  "/:id/permanent",
  validate(templateIdParamSchema),
  asyncHandler(templatesController.permanentDelete)
);

export default router;
