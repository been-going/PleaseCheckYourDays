// e:/pleaseCheckYourDays/backend/src/controllers/dashboard.controller.ts
import { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service.js";
import { getUserIdFromRequest } from "../utils/auth.utils.js";

export const getRoutineStats = async (req: Request, res: Response) => {
  // req.user는 protect 미들웨어에서 설정해줍니다.
  const userId = getUserIdFromRequest(req);
  const sortBy = (req.query.sortBy as string) || "rate_desc";

  const stats = await dashboardService.getRoutineStatsForUser(userId, sortBy);

  res.status(200).json(stats);
};
