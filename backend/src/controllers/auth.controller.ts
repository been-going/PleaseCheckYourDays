import { Request, Response } from "express";
import * as authService from "../services/auth.service.js";

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
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Vercel(프론트엔드)과 EC2(백엔드)는 다른 도메인이므로, 쿠키를 전송하려면 'none'으로 설정해야 합니다.
    // 'none'으로 설정 시 'secure: true'가 반드시 필요하며, 이는 백엔드가 HTTPS로 서비스되어야 함을 의미합니다.
    // 개발 환경에서는 'lax'를 사용합니다.
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
