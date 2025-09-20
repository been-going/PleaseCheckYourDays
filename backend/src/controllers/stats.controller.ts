import { Request, Response } from "express";
import * as statsService from "../services/stats.service.js";

import { getUserIdFromRequest } from "../utils/auth.utils.js";

export const getStats = async (req: Request, res: Response) => {
  // Zod가 이미 query 값을 숫자로 변환해주었습니다.
  const year = req.query.year as unknown as number;
  const month = req.query.month as unknown as number;

  const stats = await statsService.getMonthlyStats(
    getUserIdFromRequest(req),
    year,
    month
  );
  res.status(200).json(stats);
};
