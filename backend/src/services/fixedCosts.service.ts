// e:/pleaseCheckYourDays/backend/src/services/fixedCosts.service.ts
import prisma from "../lib/prisma";
import { FixedCost } from "@prisma/client";

export const getFixedCosts = (userId: string) =>
  prisma.fixedCost.findMany({ where: { userId } });

export const addFixedCost = (
  userId: string,
  data: Pick<FixedCost, "name" | "amount" | "paymentDate">
) => prisma.fixedCost.create({ data: { ...data, userId } });

export const deleteFixedCost = async (id: string, userId: string) => {
  const result = await prisma.fixedCost.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    const error = new Error(
      "Fixed cost not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
};
