// e:/pleaseCheckYourDays/backend/src/middleware/auth.middleware.ts
import passport from "passport";

// passport.authenticate는 내부적으로 다음 미들웨어로 제어를 넘기거나,
// 인증 실패 시 401 Unauthorized 에러를 응답합니다.
export const protect = passport.authenticate("jwt", { session: false });
