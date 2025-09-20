// e:/pleaseCheckYourDays/backend/src/services/tasks.service.ts
import prisma from "../lib/prisma.js";
import { DailyTask } from "@prisma/client";

export const getDailyTasks = (userId: string, date: string) =>
  prisma.dailyTask.findMany({ where: { userId, dateYMD: date } });

export const getTasksForRange = (userId: string, from: string, to: string) =>
  prisma.dailyTask.findMany({
    where: { userId, dateYMD: { gte: from, lte: to } },
  });

export const addOneoff = (userId: string, title: string, dateYMD: string) =>
  prisma.dailyTask.create({
    data: { userId, title, dateYMD, isOneOff: true },
  });

export const updateTask = async (
  id: string,
  userId: string,
  data: Partial<Pick<DailyTask, "checked" | "note" | "value">>
) => {
  const result = await prisma.dailyTask.updateMany({
    where: { id, userId },
    data,
  });

  if (result.count === 0) {
    const error = new Error(
      "Task not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
  // updateMany는 업데이트된 레코드를 반환하지 않으므로, 클라이언트에 반환하기 위해 다시 조회합니다.
  return prisma.dailyTask.findUniqueOrThrow({ where: { id } });
};

export const deleteTask = async (id: string, userId: string) => {
  // deleteMany를 사용하여 id와 userId를 모두 검사하여 안전하게 삭제합니다.
  const result = await prisma.dailyTask.deleteMany({
    where: { id, userId },
  });

  // 삭제된 레코드가 없으면 권한이 없거나 존재하지 않는 작업이므로 에러를 발생시킵니다.
  if (result.count === 0) {
    const error = new Error(
      "Task not found or you do not have permission."
    ) as any;
    error.statusCode = 404;
    throw error;
  }
};

export const upsertTaskFromTemplate = async (
  userId: string,
  templateId: string,
  dateYMD: string,
  checked: boolean
) => {
  const existing = await prisma.dailyTask.findUnique({
    where: { userId_dateYMD_templateId: { userId, templateId, dateYMD } },
  });
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Template not found");

  if (existing) {
    return prisma.dailyTask.update({
      where: { id: existing.id },
      data: { checked },
    });
  } else {
    return prisma.dailyTask.create({
      data: {
        userId,
        templateId,
        dateYMD,
        checked,
        title: template.title,
        isOneOff: false,
        weight: template.weight,
      },
    });
  }
};

export const upsertTaskNote = async (
  userId: string,
  templateId: string,
  dateYMD: string,
  note: string | null,
  value: number | null
) => {
  const existing = await prisma.dailyTask.findUnique({
    where: { userId_dateYMD_templateId: { userId, templateId, dateYMD } },
  });
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Template not found");

  const dataToUpdate: { note?: string | null; value?: number | null } = {};
  if (note !== undefined) dataToUpdate.note = note;
  if (value !== undefined) dataToUpdate.value = value;

  if (existing) {
    return prisma.dailyTask.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });
  } else {
    return prisma.dailyTask.create({
      data: {
        userId,
        templateId,
        dateYMD,
        checked: false,
        title: template.title,
        isOneOff: false,
        weight: template.weight,
        note: note,
        value: value,
      },
    });
  }
};
