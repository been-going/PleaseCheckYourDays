// e:/pleaseCheckYourDays/backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("💥 UNHANDLED ERROR", err);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : "서버에 문제가 발생했습니다.";

  res.status(statusCode).json({
    status: "error",
    message,
  });
};
