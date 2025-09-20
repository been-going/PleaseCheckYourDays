import prisma from "../lib/prisma.js";

export const getMonthlyStats = async (
  userId: string,
  year: number,
  month: number
) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const startDateString = startDate.toISOString().split("T")[0];
  const endDateString = endDate.toISOString().split("T")[0];

  // Promise.all을 사용하여 데이터를 병렬로 조회합니다.
  const [tasks, tasksByTemplate, fixedCosts] = await Promise.all([
    // 1. Task completion stats
    prisma.dailyTask.findMany({
      where: {
        userId,
        dateYMD: {
          gte: startDateString,
          lte: endDateString,
        },
      },
    }),
    // 2. Tasks by template (category)
    prisma.dailyTask.groupBy({
      by: ["templateId"],
      where: {
        userId,
        templateId: { not: null },
        dateYMD: { gte: startDateString, lte: endDateString },
      },
      _count: { id: true },
    }),
    // 3. Fixed costs for the month
    prisma.fixedCost.findMany({ where: { userId } }),
  ]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.checked).length;

  const templateIds = tasksByTemplate.map((t) => t.templateId!);
  const templates = await prisma.template.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, title: true },
  });
  const templateMap = new Map(templates.map((t) => [t.id, t.title]));

  const categoryStats = tasksByTemplate.map((t) => ({
    name: templateMap.get(t.templateId!) || "Unknown",
    count: t._count.id,
  }));

  const totalFixedCost = fixedCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return {
    taskStats: {
      total: totalTasks,
      completed: completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    },
    categoryStats,
    fixedCostStats: {
      total: totalFixedCost,
      count: fixedCosts.length,
    },
  };
};
