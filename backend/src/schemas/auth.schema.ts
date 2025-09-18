import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email("유효한 이메일 형식이 아닙니다."),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("유효한 이메일 형식이 아닙니다."),
    password: z.string().min(1, "비밀번호를 입력해주세요."),
  }),
});
