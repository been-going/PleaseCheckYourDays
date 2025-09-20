// e:/pleaseCheckYourDays/backend/src/services/templates.service.ts
import prisma from "../lib/prisma.js";
import { Template } from "@prisma/client";

export const getActiveTemplates = (userId: string) =>
  prisma.template.findMany({
    where: { userId, isArchived: false },
    orderBy: { order: "asc" },
  });

export const getAllTemplates = (userId: string) =>
  prisma.template.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

export const createTemplate = (
  userId: string,
  data: Pick<Template, "title" | "group">
) => prisma.template.create({ data: { ...data, userId } });

export const reorderTemplates = async (
  userId: string,
  updates: { id: string; order: number }[]
) => {
  // 트랜잭션을 사용하여 모든 업데이트가 성공하거나 하나라도 실패하면 모두 롤백되도록 합니다.
  const transaction = updates.map((update) =>
    prisma.template.updateMany({
      where: { id: update.id, userId }, // 사용자가 소유한 템플릿만 업데이트하도록 보장
      data: { order: update.order },
    })
  );
  return prisma.$transaction(transaction);
};

export const updateTemplate = async (
  id: string,
  userId: string,
  data: Partial<Template>
) => {
  const result = await prisma.template.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) {
    const error = new Error(
      "Template not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
  return prisma.template.findUniqueOrThrow({ where: { id } });
};

export const softDeleteTemplate = async (id: string, userId: string) => {
  const result = await prisma.template.updateMany({
    where: { id, userId },
    data: { isArchived: true },
  });
  if (result.count === 0) {
    const error = new Error(
      "Template not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
};

export const getDeletedTemplates = (userId: string) =>
  prisma.template.findMany({ where: { userId, isArchived: true } });

export const restoreTemplate = async (id: string, userId: string) => {
  const result = await prisma.template.updateMany({
    where: { id, userId, isArchived: true },
    data: { isArchived: false },
  });
  if (result.count === 0) {
    const error = new Error(
      "Template not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
  return prisma.template.findUniqueOrThrow({ where: { id } });
};

export const permanentDeleteTemplate = async (id: string, userId: string) => {
  const result = await prisma.template.deleteMany({
    where: { id, userId, isArchived: true },
  });
  if (result.count === 0) {
    const error = new Error(
      "Template not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
};
