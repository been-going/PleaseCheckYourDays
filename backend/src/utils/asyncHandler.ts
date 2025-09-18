// e:/pleaseCheckYourDays/backend/src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from "express";

// 동기, 비동기 컨트롤러를 모두 처리할 수 있도록 타입을 확장합니다.
type ControllerFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | void;

export const asyncHandler =
  (execution: ControllerFunction) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Promise.resolve()로 감싸서 동기/비동기 함수 모두 안전하게 처리합니다.
    Promise.resolve(execution(req, res, next)).catch(next);
  };
