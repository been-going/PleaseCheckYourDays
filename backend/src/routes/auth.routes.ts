import { Router } from "express";
import rateLimit from "express-rate-limit";
import { signup, login, logout, getMe } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validation.middleware";
import { signupSchema, loginSchema } from "../schemas/auth.schema";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// 로그인 엔드포인트에 더 엄격한 rate-limit 적용 (Brute-force 방지)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 15분 동안 10번 시도 가능
  message: "너무 많은 로그인 시도를 하셨습니다. 15분 후에 다시 시도해주세요.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", validate(signupSchema), asyncHandler(signup));
router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", protect, asyncHandler(getMe));

export default router;
