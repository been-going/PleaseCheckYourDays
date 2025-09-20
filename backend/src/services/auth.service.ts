import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export const signupUser = async (userData: Prisma.UserCreateInput) => {
  const { email, password } = userData;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const error = new Error("이미 사용중인 이메일입니다.") as any;
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  return user;
};

export const loginUser = async (
  credentials: Pick<Prisma.UserCreateInput, "email" | "password">
) => {
  const { email, password } = credentials;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error("이메일 또는 비밀번호가 올바르지 않습니다.") as any;
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("이메일 또는 비밀번호가 올바르지 않습니다.") as any;
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    {
      expiresIn: "7d",
    }
  );

  return token;
};
