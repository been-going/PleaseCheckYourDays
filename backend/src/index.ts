import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { Prisma, User } from "@prisma/client";
import prisma from "./lib/prisma";
import passport from "./lib/passport";
import authRoutes from "./routes/auth";
import statsRoutes from "./routes/stats";

declare global {
  namespace Express {
    type PrismaUser = import("@prisma/client").User;
    interface User extends PrismaUser {}
    interface Request {
      user?: User;
    }
  }
}

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    exposedHeaders: ["Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());

// Logging middleware to see incoming request headers
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Request Headers:", req.headers);
  next();
});

// ─────────────────────────── UTILS & HELPERS ───────────────────────────

const safe =
  (fn: (req: Request, res: Response, next: NextFunction) => any) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function ymdKST(d = new Date()) {
  const KST = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = KST.getUTCFullYear();
  const m = String(KST.getUTCMonth() + 1).padStart(2, "0");
  const day = String(KST.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isDone(t: {
  checked: boolean | number; // Raw query can return 1/0 for boolean
  note?: string | null;
  value?: number | null;
}) {
  // A task is considered "done" only if it is explicitly checked.
  // Notes or values no longer count towards completion for the summary percentage.
  return !!t.checked;
}

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    from: ymd(from),
    to: ymd(to),
    days: Array.from({ length: to.getDate() }, (_, i) =>
      ymd(new Date(y, m - 1, i + 1))
    ),
  };
}

/**
 * Recalculates and updates the daily summary for a specific user and date.
 * This function determines the total and completed "weight" of tasks for the day.
 * @param userId - The ID of the user.
 * @param dateYMD - The date in 'YYYY-MM-DD' format.
 */
async function recalcSummary(userId: string, dateYMD: string) {
  const whereUser = { userId };

  // 1. Get ALL templates for the user, including archived ones.
  const allTemplates = await prisma.template.findMany({
    where: { ...whereUser },
  });

  // 2. Get all tasks for the given day.
  const tasks = await prisma.dailyTask.findMany({
    where: { ...whereUser, dateYMD },
  });

  // 3. Determine which templates were active ON THAT SPECIFIC DAY.
  const templatesActiveOnDate = allTemplates.filter((tpl) => {
    // Only consider defaultActive templates for the base total weight.
    if (!tpl.defaultActive) return false;

    const createdAtDate = tpl.createdAt.toISOString().substring(0, 10);
    // Template must have been created on or before the summary date.
    if (dateYMD < createdAtDate) return false;

    // If the template is archived, it was only active if the summary date is BEFORE it was archived.
    // We use updatedAt as the archival timestamp.
    if (tpl.isArchived) {
      const archivedAtDate = tpl.updatedAt.toISOString().substring(0, 10);
      // If the summary is for a date on or after archival, it wasn't active on that day.
      if (dateYMD >= archivedAtDate) {
        return false;
      }
    }
    // If not archived and created before/on the date, it was active.
    return true;
  });

  // 4. Calculate total weight from templates that were active on that day.
  const activeTemplatesTotalWeight = templatesActiveOnDate.reduce(
    (a, t) => a + t.weight,
    0
  );

  // 5. Calculate total weight for one-off tasks for that day.
  const oneOffTasksTotalWeight = tasks
    .filter((t) => t.isOneOff)
    .reduce((a, t) => a + t.weight, 0);

  // 6. The real total weight for the day is the sum of both.
  const totalWeight = activeTemplatesTotalWeight + oneOffTasksTotalWeight;

  // 7. Done weight is calculated from all tasks of the day, which is correct.
  const doneWeight = tasks.filter(isDone).reduce((a, t) => a + t.weight, 0);

  // 8. Upsert the summary with the correctly calculated weights.
  await prisma.daySummary.upsert({
    where: { userId_dateYMD: { userId, dateYMD } },
    update: { totalWeight, doneWeight },
    create: { userId, dateYMD, totalWeight, doneWeight },
  });
}

/**
 * Generates a matrix of task completion data for a given month and user.
 * Used for calendar-like visualizations.
 * @param userId - The ID of the user.
 * @param ym - The month in 'YYYY-MM' format.
 */
async function calculateMonthMatrix(userId: string, ym: string) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  const templates = await prisma.template.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  const { from, to, days } = monthRange(ym);
  const tasks = await prisma.dailyTask.findMany({
    where: {
      userId,
      dateYMD: { gte: from, lte: to },
      templateId: { in: templates.map((t) => t.id) },
    },
  });
  const byDate: Record<string, Record<string, (typeof tasks)[number]>> = {};
  for (const t of tasks) {
    if (t.templateId)
      byDate[t.dateYMD] = { ...byDate[t.dateYMD], [t.templateId]: t };
  }
  const rows = days.map((d) => {
    const cells: Record<string, { done: boolean; note?: string | null }> = {};
    for (const tpl of templates) {
      const t = byDate[d]?.[tpl.id];
      cells[tpl.id] = { done: t ? isDone(t) : false, note: t?.note ?? null };
    }
    return { dateYMD: d, cells };
  });
  return {
    columns: templates.map((t) => ({
      id: t.id,
      title: t.title,
      group: t.group,
    })),
    rows,
  };
}

// ─────────────────────────── ROUTES ───────────────────────────

const auth = passport.authenticate("jwt", { session: false });

// Public routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/stats", auth, statsRoutes);

// Protected routes
app.get(
  "/api/templates",
  auth,
  safe(async (req, res) => {
    const list = await prisma.template.findMany({
      where: { userId: req.user!.id, isArchived: false },
      orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });
    res.json(list);
  })
);

app.post(
  "/api/templates",
  auth,
  safe(async (req, res) => {
    const { title, group = "EXECUTE", weight = 1 } = req.body || {};
    if (!title) return res.status(400).json({ message: "title is required" });
    if (!["MORNING", "EXECUTE", "EVENING"].includes(group))
      return res.status(400).json({ message: "invalid group" });
    const order = await prisma.template.count({
      where: { userId: req.user!.id, group },
    });
    try {
      const t = await prisma.template.create({
        data: { title, group, weight, order, userId: req.user!.id },
      });
      return res.status(201).json(t);
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      )
        return res
          .status(409)
          .json({ message: "template (title, group) already exists" });
      throw e;
    }
  })
);

app.put(
  "/api/templates/:id",
  auth,
  safe(async (req, res) => {
    const id = String(req.params.id);
    const { title, group, defaultActive, weight, order } = req.body || {};
    const data: any = {};
    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof group === "string") {
      if (!["MORNING", "EXECUTE", "EVENING"].includes(group))
        return res.status(400).json({ message: "invalid group" });
      data.group = group;
    }
    if (typeof defaultActive === "boolean") data.defaultActive = defaultActive;
    if (typeof weight === "number") data.weight = weight;
    if (typeof order === "number") data.order = order;
    try {
      const updated = await prisma.template.update({
        where: { id, userId: req.user!.id },
        data,
      });
      return res.json(updated);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002")
          return res
            .status(409)
            .json({ message: "template (title, group) already exists" });
        if (e.code === "P2025")
          return res.status(404).json({ message: "template not found" });
      }
      throw e;
    }
  })
);

app.delete(
  "/api/templates/:id",
  auth,
  safe(async (req, res) => {
    const id = String(req.params.id);
    // This is now a "soft delete", moving the template to the archive.
    await prisma.template.update({
      where: { id, userId: req.user!.id },
      data: { isArchived: true },
    });
    return res.json({ ok: true });
  })
);

app.get(
  "/api/templates/archived",
  auth,
  safe(async (req, res) => {
    const list = await prisma.template.findMany({
      where: { userId: req.user!.id, isArchived: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(list);
  })
);

app.get(
  "/api/templates/all",
  auth,
  safe(async (req, res) => {
    const list = await prisma.template.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });
    res.json(list);
  })
);

app.put(
  "/api/templates/:id/restore",
  auth,
  safe(async (req, res) => {
    const id = String(req.params.id);
    const restored = await prisma.template.update({
      where: { id, userId: req.user!.id },
      data: { isArchived: false },
    });
    res.json(restored);
  })
);

app.delete(
  "/api/templates/:id/permanent",
  auth,
  safe(async (req, res) => {
    const id = String(req.params.id);
    // Permanent deletion requires deleting all associated tasks first.
    await prisma.$transaction([
      prisma.dailyTask.deleteMany({
        where: { templateId: id, userId: req.user!.id },
      }),
      prisma.template.delete({
        where: { id, userId: req.user!.id, isArchived: true },
      }),
    ]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/daily/tasks",
  auth,
  safe(async (req, res) => {
    const dateYMD = (req.query.date as string) || ymdKST();
    const tasks = await prisma.dailyTask.findMany({
      where: { dateYMD, userId: req.user!.id },
      orderBy: [{ template: { group: "asc" } }, { createdAt: "asc" }],
      include: { template: { select: { group: true } } },
    });
    res.json({ dateYMD, tasks });
  })
);

// --- 여기를 추가했습니다! ---
app.get(
  "/api/daily/tasks/range",
  auth,
  safe(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "from and to dates are required" });
    }
    const tasks = await prisma.dailyTask.findMany({
      where: {
        userId: req.user!.id,
        dateYMD: { gte: from, lte: to },
      },
      orderBy: [{ dateYMD: "asc" }, { createdAt: "asc" }],
    });
    res.json(tasks);
  })
);
// --------------------------

app.post(
  "/api/daily/check",
  auth,
  safe(async (req, res) => {
    const { dateYMD, templateId, checked, note, value } = req.body || {};
    const date = dateYMD || ymdKST();
    if (!templateId)
      return res.status(400).json({ message: "templateId required" });
    const tpl = await prisma.template.findFirst({
      where: { id: templateId, userId: req.user!.id },
    });
    if (!tpl) return res.status(400).json({ message: "invalid templateId" });

    const data: {
      checked?: boolean;
      note?: string | null;
      value?: number | null;
    } = {};
    if (checked !== undefined) data.checked = !!checked;
    if (note !== undefined) data.note = note;
    if (value !== undefined) data.value = value;

    const row = await prisma.dailyTask.upsert({
      where: {
        userId_dateYMD_templateId: {
          userId: req.user!.id,
          dateYMD: date,
          templateId,
        },
      },
      create: {
        ...data,
        dateYMD: date,
        templateId: tpl.id,
        title: tpl.title,
        weight: tpl.weight,
        isOneOff: false,
        userId: req.user!.id,
      },
      update: data,
    });
    await recalcSummary(req.user!.id, date);
    res.json(row);
  })
);

app.post(
  "/api/daily/init",
  auth,
  safe(async (req, res) => {
    const today = ymdKST();
    const settingKey = "last_opened_ymd";
    const last = await prisma.setting.findUnique({
      where: { userId_key: { userId: req.user!.id, key: settingKey } },
    });
    const lastYMD = last?.value;
    if (lastYMD && lastYMD !== today) {
      await recalcSummary(req.user!.id, lastYMD);
    }
    await prisma.setting.upsert({
      where: { userId_key: { userId: req.user!.id, key: settingKey } },
      update: { value: today },
      create: { key: settingKey, value: today, userId: req.user!.id },
    });
    await recalcSummary(req.user!.id, today);
    return res.json({ ok: true, dateYMD: today });
  })
);

app.post(
  "/api/daily/oneoff",
  auth,
  safe(async (req, res) => {
    const { title, dateYMD, weight = 1 } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });
    const ymd = dateYMD || ymdKST();
    const t = await prisma.dailyTask.create({
      data: {
        dateYMD: ymd,
        title,
        weight,
        isOneOff: true,
        userId: req.user!.id,
      },
    });
    await recalcSummary(req.user!.id, ymd);
    res.status(201).json(t);
  })
);

app.patch(
  "/api/tasks/:id",
  auth,
  safe(async (req, res) => {
    const { id } = req.params;
    const { checked, note, value } = req.body || {};
    const prev = await prisma.dailyTask.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!prev) return res.status(404).json({ message: "Not found" });

    const dataToUpdate: Prisma.DailyTaskUpdateInput = {};
    if (typeof checked === "boolean") dataToUpdate.checked = checked;
    if (note !== undefined) dataToUpdate.note = note;
    if (value !== undefined) dataToUpdate.value = value;

    const updated = await prisma.dailyTask.update({
      where: { id },
      data: dataToUpdate,
    });
    await recalcSummary(req.user!.id, updated.dateYMD);
    res.json(updated);
  })
);

app.delete(
  "/api/tasks/:id",
  auth,
  safe(async (req, res) => {
    const task = await prisma.dailyTask.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!task) return res.status(404).json({ message: "task not found" });
    await prisma.dailyTask.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

app.get(
  "/api/summaries",
  auth,
  safe(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const where: Prisma.DaySummaryWhereInput = { userId: req.user!.id };
    if (from && to) {
      where.dateYMD = { gte: from, lte: to };
    }
    const list = await prisma.daySummary.findMany({ where });
    res.json(list);
  })
);

app.get(
  "/api/month/matrix",
  auth,
  safe(async (req, res) => {
    const ym = String(req.query.ym || "").slice(0, 7);
    const matrix = await calculateMonthMatrix(req.user!.id, ym);
    if (!matrix) return res.status(400).json({ message: "ym must be YYYY-MM" });
    res.json(matrix);
  })
);

app.post(
  "/api/daily/note",
  auth,
  safe(async (req, res) => {
    const { dateYMD, templateId, note, value } = req.body;
    if (!dateYMD || !templateId)
      return res.status(400).json({ message: "dateYMD, templateId required" });
    const tpl = await prisma.template.findFirst({
      where: { id: templateId, userId: req.user!.id },
    });
    if (!tpl) return res.status(404).json({ message: "template not found" });
    const data: { note?: string; value?: number | null } = {};
    if (note !== undefined) data.note = note;
    if (value !== undefined) data.value = value;

    const row = await prisma.dailyTask.upsert({
      where: {
        userId_dateYMD_templateId: {
          userId: req.user!.id,
          dateYMD,
          templateId,
        },
      },
      create: {
        ...data,
        dateYMD,
        templateId,
        title: tpl.title,
        weight: tpl.weight,
        isOneOff: false,
        userId: req.user!.id,
      },
      update: data,
    });
    await recalcSummary(req.user!.id, dateYMD);
    return res.json(row);
  })
);

// Fixed Costs
app.get(
  "/api/fixed-costs",
  auth,
  safe(async (req, res) => {
    const costs = await prisma.fixedCost.findMany({
      where: { userId: req.user!.id },
      orderBy: { paymentDate: "asc" },
    });
    res.json(costs);
  })
);

app.post(
  "/api/fixed-costs",
  auth,
  safe(async (req, res) => {
    const { name, amount, paymentDate } = req.body || {};
    if (!name || typeof amount !== "number" || typeof paymentDate !== "number")
      return res
        .status(400)
        .json({ message: "name, amount, paymentDate are required" });
    const cost = await prisma.fixedCost.create({
      data: { name, amount, paymentDate, userId: req.user!.id },
    });
    res.status(201).json(cost);
  })
);

app.put(
  "/api/fixed-costs/:id",
  auth,
  safe(async (req, res) => {
    const { id } = req.params;
    const { name, amount, paymentDate } = req.body || {};
    try {
      const updatedCost = await prisma.fixedCost.update({
        where: { id, userId: req.user!.id },
        data: {
          name: name ?? undefined,
          amount: amount ?? undefined,
          paymentDate: paymentDate ?? undefined,
        },
      });
      res.json(updatedCost);
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      )
        return res.status(404).json({ message: "Fixed cost not found" });
      throw e;
    }
  })
);

app.delete(
  "/api/fixed-costs/:id",
  auth,
  safe(async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.fixedCost.delete({ where: { id, userId: req.user!.id } });
      res.json({ ok: true });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      )
        return res.status(404).json({ message: "Fixed cost not found" });
      throw e;
    }
  })
);

// Goals
app.get(
  "/api/goals",
  auth,
  safe(async (req, res) => {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user!.id },
      orderBy: { targetDate: "asc" },
    });
    res.json(goals);
  })
);

app.post(
  "/api/goals",
  auth,
  safe(async (req, res) => {
    const { title, description, startDate, targetDate } = req.body || {};
    if (!title || !targetDate) {
      return res
        .status(400)
        .json({ message: "title and targetDate are required" });
    }
    const goal = await prisma.goal.create({
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : new Date(),
        targetDate: new Date(targetDate),
        userId: req.user!.id,
      },
    });
    res.status(201).json(goal);
  })
);

app.put(
  "/api/goals/:id",
  auth,
  safe(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }
    const { title, description, targetDate, progress, isAchieved } =
      req.body || {};
    try {
      const updatedGoal = await prisma.goal.update({
        where: { id, userId: req.user!.id },
        data: {
          title: title ?? undefined,
          description: description ?? undefined,
          targetDate: targetDate ? new Date(targetDate) : undefined,
          progress: progress ?? undefined,
          isAchieved: isAchieved ?? undefined,
        },
      });
      res.json(updatedGoal);
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return res.status(404).json({ message: "Goal not found" });
      }
      throw e;
    }
  })
);

app.delete(
  "/api/goals/:id",
  auth,
  safe(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }
    try {
      await prisma.goal.delete({ where: { id, userId: req.user!.id } });
      res.json({ ok: true });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return res.status(404).json({ message: "Goal not found" });
      }
      throw e;
    }
  })
);

// NEW DASHBOARD ENDPOINT
app.get(
  "/api/dashboard",
  auth,
  safe(async (req, res) => {
    const year = new Date().getFullYear();
    const yearQuery = parseInt(String(req.query.year), 10);
    const targetYear = isNaN(yearQuery) ? year : yearQuery;
    const templates = await prisma.template.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });
    const matrixPromises = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      return calculateMonthMatrix(req.user!.id, `${targetYear}-${month}`);
    });
    const yearlyMatrixData = await Promise.all(matrixPromises);
    res.json({ templates, yearlyMatrixData });
  })
);

app.get(
  "/api/dashboard/routines",
  auth,
  safe(async (req, res) => {
    const { sortBy = "rate_desc", limit } = req.query;
    const userId = req.user!.id;

    // Corrected Raw Query for MySQL
    const routineStats: any[] = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.createdAt,
        t.isArchived,
        CAST((
          SELECT COUNT(DISTINCT dt.dateYMD)
          FROM \`DailyTask\` dt
          WHERE
            dt.templateId = t.id AND
            dt.checked = TRUE
        ) AS SIGNED) AS "doneCount"
      FROM \`Template\` t
      WHERE t.userId = ${userId}
    `;

    const today = new Date();
    const routines = routineStats.map((r) => {
      const createdAt = new Date(r.createdAt);

      const start = new Date(
        Date.UTC(
          createdAt.getUTCFullYear(),
          createdAt.getUTCMonth(),
          createdAt.getUTCDate()
        )
      );
      const end = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      );

      const timeDiff = end.getTime() - start.getTime();
      const totalDays = Math.max(
        1,
        Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1
      );

      const doneCount = Number(r.doneCount || 0);
      const successRate = totalDays > 0 ? (doneCount / totalDays) * 100 : 0;

      return {
        id: r.id,
        title: r.title,
        createdAt: createdAt.toISOString(),
        successRate,
        totalDays,
        doneCount,
        isArchived: !!r.isArchived,
      };
    });

    routines.sort((a, b) => {
      switch (sortBy) {
        case "rate_asc":
          return a.successRate - b.successRate;
        case "date_desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "date_asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "rate_desc":
        default:
          return b.successRate - a.successRate;
      }
    });

    const limitNum = limit ? parseInt(String(limit), 10) : undefined;
    res.json(limitNum ? routines.slice(0, limitNum) : routines);
  })
);

app.get(
  "/api/routines/:id",
  auth,
  safe(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const template = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!template) {
      return res.status(404).json({ message: "Routine not found" });
    }

    // Use a raw query to fetch tasks to ensure consistency with dashboard
    const tasks: any[] = await prisma.$queryRaw`
      SELECT dateYMD, checked, note, value
      FROM \`DailyTask\`
      WHERE userId = ${userId} AND templateId = ${id}
      ORDER BY dateYMD ASC
    `;

    const completionData = tasks
      .filter(isDone) // Now correctly filters by checked status only
      .map((task) => {
        let level = 1; // Base level for just being checked
        if (task.note && task.note.trim().length > 0) level = 2;
        if (typeof task.value === "number") level = 3; // Highest level for having a value
        return {
          date: task.dateYMD,
          level,
          note: task.note,
          value: task.value,
        };
      });

    res.json({
      id: template.id,
      title: template.title,
      createdAt: template.createdAt,
      completionData,
    });
  })
);

// ───────────────────────── ERROR HANDLER & LISTEN ─────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("[API ERROR]", err);
  const user = req.user
    ? `${req.user.email} (ID: ${req.user.id})`
    : "Anonymous";
  console.error(`Error occurred for user: ${user}`);
  res.status(500).json({ message: "Internal error", detail: err?.message });
});

const PORT = Number(process.env.PORT || 4001);
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));

app.use((_req, res) => res.status(404).send("Not Found"));
