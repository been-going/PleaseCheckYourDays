// e:/pleaseCheckYourDays/backend/src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import passport from "./config/passport.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// --- Security Middlewares ---

// 1. Set various security HTTP headers
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173", // 로컬 프론트엔드 개발 서버
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// 2. Configure CORS for production to allow credentials
const corsOptions = {
  // 개발 및 프로덕션 환경의 출처를 모두 허용합니다.
  origin: allowedOrigins,
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

// Nginx 같은 리버스 프록시 뒤에서 실행될 때, Express가 클라이언트 IP와 프로토콜을 신뢰하도록 설정합니다.
app.set("trust proxy", 1);

// API Routes - 모든 API 경로는 /api 접두사를 갖습니다.
app.use("/api", apiRoutes);

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
