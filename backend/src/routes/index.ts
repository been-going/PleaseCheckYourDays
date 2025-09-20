// e:/pleaseCheckYourDays/backend/src/routes/index.ts
import { Router } from "express";
import dashboardRoutes from "./dashboard.routes.js";
import authRoutes from "./auth.routes.js";
import taskRoutes from "./tasks.routes.js";
import templateRoutes from "./templates.routes.js";
import fixedCostsRoutes from "./fixedCosts.routes.js";
import dailyRoutes from "./daily.routes.js";
import statsRoutes from "./stats.routes.js";

const router = Router();

router.use("/dashboard", dashboardRoutes);
router.use("/auth", authRoutes);
router.use("/tasks", taskRoutes);
router.use("/daily", dailyRoutes);
router.use("/templates", templateRoutes);
router.use("/fixed-costs", fixedCostsRoutes);
router.use("/stats", statsRoutes);

export default router;
