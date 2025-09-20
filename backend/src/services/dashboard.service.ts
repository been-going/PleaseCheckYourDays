// e:/pleaseCheckYourDays/backend/src/services/dashboard.service.ts
import prisma from "../lib/prisma.js";

type RoutineStat = {
  id: string;
  title: string;
  doneCount: number;
  totalDays: number;
  successRate: number;
  createdAt: Date;
  isArchived: boolean;
};

/**
 * 루틴 통계를 계산합니다.
 * 백엔드에서 totalDays를 정확하게 계산하여 달성률 오류를 수정합니다.
 */
export const getRoutineStatsForUser = async (
  userId: string,
  sortBy: string = "rate_desc"
): Promise<RoutineStat[]> => {
  const templates = await prisma.template.findMany({
    where: { userId, isArchived: false },
    include: {
      tasks: {
        where: { checked: true },
        select: { dateYMD: true },
      },
    },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // 시간대를 UTC로 통일하여 일관성 유지

  const stats: RoutineStat[] = templates.map((template) => {
    const createdAt = new Date(template.createdAt);
    createdAt.setUTCHours(0, 0, 0, 0);

    // 보관된 루틴은 보관된 날짜(updatedAt)까지를 총 기간으로 계산
    const endDate = template.isArchived ? new Date(template.updatedAt) : today;
    endDate.setUTCHours(0, 0, 0, 0);

    // 시작일이 종료일보다 늦는 경우 방지
    const effectiveEndDate = endDate < createdAt ? createdAt : endDate;

    const timeDiff = effectiveEndDate.getTime() - createdAt.getTime();
    // +1을 하여 시작일과 종료일을 모두 포함한 일수를 계산
    const totalDays = Math.max(
      1,
      Math.floor(timeDiff / (1000 * 3600 * 24)) + 1
    );

    const doneCount = template.tasks.length;
    const successRate = totalDays > 0 ? (doneCount / totalDays) * 100 : 0;

    return {
      id: template.id,
      title: template.title,
      doneCount,
      totalDays,
      successRate,
      createdAt: template.createdAt,
      isArchived: template.isArchived,
    };
  });

  // 정렬 로직
  stats.sort((a, b) => {
    switch (sortBy) {
      case "rate_asc":
        return a.successRate - b.successRate;
      case "date_desc":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "date_asc":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "rate_desc":
      default:
        return b.successRate - a.successRate;
    }
  });

  return stats;
};
