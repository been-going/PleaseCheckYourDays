// e:/pleaseCheckYourDays/backend/src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import passport from "./config/passport";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// --- Security Middlewares ---

// 1. Set various security HTTP headers
app.use(helmet());

// 2. Configure CORS for production to allow credentials
const corsOptions = {
  // 실제 프로덕션 환경의 프론트엔드 URL로 교체해야 합니다.
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true, // HttpOnly 쿠키를 주고받기 위해 필수
};
app.use(cors(corsOptions));

// 3. General API rate limiting to prevent DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
// '/api' 접두사를 제거하여 모든 라우트에 적용
app.use(limiter);

// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser()); // Add cookie-parser to handle HttpOnly cookies
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// API Routes - '/api' 접두사 없이 직접 라우트를 사용합니다.
app.use("/", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("Server is running!");
});

// Not Found Handler (should be after all routes)
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Central Error Handler (should be the last middleware)
app.use(errorHandler);

export default app;
