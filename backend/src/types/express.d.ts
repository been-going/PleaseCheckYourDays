import { User as PrismaUser } from "@prisma/client";

// 기존 Express 네임스페이스를 확장합니다.
declare global {
  namespace Express {
    // Passport가 생성하는 User 인터페이스를 Prisma의 User 타입으로 확장합니다.
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface User extends PrismaUser {}

    export interface Request {
      user?: User;
    }
  }
}
