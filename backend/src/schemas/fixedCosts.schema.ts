import { z } from "zod";

export const addFixedCostSchema = z.object({
  body: z.object({
    name: z.string().min(1, "이름을 입력해주세요."),
    amount: z.number().positive("금액은 0보다 커야 합니다."),
    paymentDate: z
      .number()
      .int()
      .min(1)
      .max(31, "날짜는 1에서 31 사이여야 합니다."),
  }),
});

export const deleteFixedCostSchema = z.object({
  params: z.object({
    id: z.string().uuid("유효한 ID 형식이 아닙니다."),
  }),
});
