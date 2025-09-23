// e:/pleaseCheckYourDays/backend/src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import session from "express-session";
import passport from "./config/passport.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// --- Security Middlewares ---

// 1. Set various security HTTP headers
app.use(helmet());

// 허용할 출처(origin) 목록입니다. 프로덕션 도메인과 www가 붙은 서브도메인을 모두 포함합니다.
const allowedOrigins = [
  "http://localhost:5173", // 로컬 프론트엔드 개발 서버
  "https://please-check-your-days.cloud",
  "https://www.please-check-your-days.cloud",
];

// 2. Configure CORS for production to allow credentials
const corsOptions = {
  // 요청의 Origin 헤더가 허용 목록에 있는지 동적으로 확인합니다.
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Postman과 같은 REST 클라이언트나 서버 간 요청에서는 origin이 없을 수 있습니다.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
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

// Nginx 같은 리버스 프록시 뒤에서 실행될 때, Express가 클라이언트 IP와 프로토콜을 신뢰하도록 설정합니다.
app.set("trust proxy", 1);

// Session Middleware - Passport보다 먼저 와야 합니다.
app.use(
  session({
    // 중요: 환경 변수에서 강력한 비밀 키를 가져와 사용해야 합니다.
    secret: process.env.COOKIE_SECRET || "dev-secret-key-for-local-use-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // 프로덕션에서는 true
      sameSite: isProduction ? "lax" : "lax",
      // www와 non-www 도메인 모두에서 쿠키가 동작하도록 설정
      domain: isProduction ? ".please-check-your-days.cloud" : undefined,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session()); // 세션 기반 인증을 위해 필수

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
