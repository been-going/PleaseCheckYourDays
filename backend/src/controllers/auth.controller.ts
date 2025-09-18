import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.signupUser({ email, password });
  res
    .status(201)
    .json({ message: "회원가입이 완료되었습니다.", userId: user.id });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const token = await authService.loginUser({ email, password });

  res.cookie("jwt", token, {
    httpOnly: true, // JavaScript에서 접근 불가하여 XSS 공격에 안전
    secure: process.env.NODE_ENV === "production", // 프로덕션에서는 HTTPS에서만 전송
    sameSite: "strict", // CSRF 공격 방어
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 유효기간
  });

  res.status(200).json({ message: "로그인 성공" });
};

export const logout = (req: Request, res: Response) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "로그아웃 성공" });
};

export const getMe = (req: Request, res: Response) => {
  // protect 미들웨어가 req.user를 설정해줍니다.
  res.status(200).json({ user: req.user });
};
