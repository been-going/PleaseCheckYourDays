import express from 'express';
import { User } from '@prisma/client'; // Re-import User type
import prisma from '../lib/prisma';


const router = express.Router();

// GET /api/stats?year=YYYY&month=MM
router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ message: 'Year and month are required' });
  }

  const yearNum = parseInt(year as string, 10);
  const monthNum = parseInt(month as string, 10);

  const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
  const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

  // Convert to YYYY-MM-DD string format for Prisma query on string date fields
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  try {
    // 1. Task completion stats
    const tasks = await prisma.dailyTask.findMany({
      where: {
        userId,
        dateYMD: {
          gte: startDateString,
          lte: endDateString,
        },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.checked).length;

    // 2. Tasks by template (category)
    const tasksByTemplate = await prisma.dailyTask.groupBy({
      by: ['templateId'],
      where: {
        userId,
        templateId: { not: null },
        dateYMD: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _count: {
        id: true,
      },
    });

    // Fetch template titles for better labels
    const templateIds = tasksByTemplate.map(t => t.templateId!);
    const templates = await prisma.template.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, title: true },
    });
    const templateMap = new Map(templates.map(t => [t.id, t.title]));

    const categoryStats = tasksByTemplate.map(t => ({
      name: templateMap.get(t.templateId!) || 'Unknown',
      count: t._count.id,
    }));

    // 3. Fixed costs for the month
    const fixedCosts = await prisma.fixedCost.findMany({ where: { userId } });
    const totalFixedCost = fixedCosts.reduce((sum, cost) => sum + cost.amount, 0);

    res.json({
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
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

export default router;
