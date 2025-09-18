// e:/pleaseCheckYourDays/backend/src/routes/index.ts
import { Router } from "express";
import dashboardRoutes from "./dashboard.routes";
import authRoutes from "./auth.routes"; // 이제 새로 만든 올바른 파일을 참조합니다.
import taskRoutes from "./tasks.routes";
import templateRoutes from "./templates.routes";
import fixedCostsRoutes from "./fixedCosts.routes";
import dailyRoutes from "./daily.routes";

const router = Router();

router.use("/dashboard", dashboardRoutes);
router.use("/auth", authRoutes);

// 프론트엔드의 API 경로 불일치 문제를 해결하기 위해 두 경로 모두에 taskRoutes를 마운트합니다.
router.use("/daily/tasks", taskRoutes); // GET /api/daily/tasks 와 같은 요청을 처리
router.use("/tasks", taskRoutes); // PATCH /api/tasks/:id 와 같은 요청을 처리

router.use("/daily", dailyRoutes); // /api/daily/* (위에서 처리되지 않은) 요청을 처리
router.use("/templates", templateRoutes);
router.use("/fixed-costs", fixedCostsRoutes);

export default router;
