import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Get all goals for the logged-in user
router.get('/', async (req, res) => {
  const userId = req.user!.id;
  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (error) {
    console.error('[API /api/goals GET] Error fetching goals:', error);
    res.status(500).json({ error: 'Error fetching goals' });
  }
});

// Create a new goal
router.post('/', async (req, res) => {
  const userId = req.user!.id;
  const { title, description, startDate, targetDate } = req.body;

  try {
    const newGoal = await prisma.goal.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        targetDate: new Date(targetDate),
        user: {
          connect: { id: userId },
        },
      },
    });
    res.status(201).json(newGoal);
  } catch (error) {
    console.error('[API /api/goals POST] Full error object:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'Error creating goal' });
  }
});

// Update a goal
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, startDate, targetDate, progress, isAchieved } = req.body;

  try {
    const updatedGoal = await prisma.goal.update({
      where: { id: parseInt(id, 10) },
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        progress,
        isAchieved,
      },
    });
    res.json(updatedGoal);
  } catch (error) {
    console.error(`[API /api/goals PUT /${id}] Error updating goal:`, error);
    res.status(500).json({ error: 'Error updating goal' });
  }
});

// Delete a goal
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.goal.delete({
      where: { id: parseInt(id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(`[API /api/goals DELETE /${id}] Error deleting goal:`, error);
    res.status(500).json({ error: 'Error deleting goal' });
  }
});

export default router;
