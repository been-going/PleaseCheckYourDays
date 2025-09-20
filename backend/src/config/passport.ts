// e:/pleaseCheckYourDays/backend/src/config/passport.ts
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Request } from "express";
import passport from "passport";
import prisma from "../lib/prisma.js";
import { config } from "./index.js";

const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["jwt"];
  }
  return token;
};

const opts = {
  // 1순위: 쿠키, 2순위: Authorization 헤더에서 토큰을 찾습니다.
  jwtFromRequest: ExtractJwt.fromExtractors([
    cookieExtractor,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: config.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      console.log("[Passport] JWT Payload Received:", jwt_payload);
      const user = await prisma.user.findUnique({
        where: { id: jwt_payload.id },
      });

      if (user) {
        console.log("[Passport] User found in DB:", user.email);
        // req.user에 사용자 객체를 첨부합니다.
        return done(null, user);
      } else {
        console.log("[Passport] User not found for ID:", jwt_payload.id);
        return done(null, false);
      }
    } catch (err) {
      console.error("[Passport] Error in JWT Strategy:", err);
      return done(err, false);
    }
  })
);

export default passport;
