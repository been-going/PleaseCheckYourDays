import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback } from 'passport-jwt';
import passport from 'passport';
import { JwtPayload } from 'jsonwebtoken';
import prisma from './prisma';



const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET!,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload: JwtPayload, done: (err: any, user?: Express.User | false, info?: any) => void) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: jwt_payload.id },
      });
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

export default passport;
