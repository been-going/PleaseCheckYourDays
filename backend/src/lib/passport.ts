import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import { JwtPayload } from "jsonwebtoken";
import prisma from "./prisma.js";

// console.log("[Passport] Loading JWT Secret from env:", process.env.JWT_SECRET);

const jwtSecret = process.env.JWT_SECRET;
// 환경 변수에 JWT_SECRET이 설정되지 않은 경우, 보안을 위해 서버 실행을 중단합니다.
if (!jwtSecret) {
  console.error(
    "Fatal Error: JWT_SECRET is not defined in environment variables."
  );
  process.exit(1);
}

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
};

console.log("[Passport] Strategy options set with secret.");

passport.use(
  new JwtStrategy(
    opts,
    async (
      jwt_payload: JwtPayload,
      done: (err: any, user?: Express.User | false, info?: any) => void
    ) => {
      console.log("[Passport] JWT Payload Received:", jwt_payload);
      try {
        const user = await prisma.user.findUnique({
          where: { id: jwt_payload.id },
        });
        if (user) {
          console.log("[Passport] User found in DB:", user.email);
          return done(null, user);
        }
        console.log("[Passport] User NOT found in DB for id:", jwt_payload.id);
        return done(null, false);
      } catch (err) {
        console.error("[Passport] Error during user lookup:", err);
        return done(err, false);
      }
    }
  )
);

export default passport;
