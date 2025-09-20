import { Request } from "express";

/**
 * 요청 객체에서 사용자 ID를 안전하게 추출합니다.
 * protect 미들웨어에 의해 req.user가 설정되었음을 전제로 합니다.
 */
export const getUserIdFromRequest = (req: Request): string => {
  if (!req.user || typeof (req.user as any).id !== "string") {
    throw new Error(
      "User ID not found on request. `protect` middleware might be missing."
    );
  }
  return (req.user as { id: string }).id;
};
