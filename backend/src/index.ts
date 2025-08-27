import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { Prisma, User } from "@prisma/client"; // Re-import Prisma and User types
import prisma from "./lib/prisma";
import passport from "./lib/passport";
import authRoutes from "./routes/auth";
import goalRoutes from "./routes/goals";
import statsRoutes from "./routes/stats";

// Express Request 인터페이스 확장
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
    credentials: true, // Allow cookies
    exposedHeaders: ["Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());

// ─────────────────────────── utils ───────────────────────────
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
  checked: boolean;
  note?: string | null;
  value?: number | null;
}) {
  return !!(
    t.checked ||
    (t.note && t.note.trim().length > 0) ||
    typeof t.value === "number"
  );
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
async function recalcSummary(userId: string, dateYMD: string) {
  const whereUser = { userId };
  const activeTemplates = await prisma.template.findMany({
    where: { ...whereUser, defaultActive: true },
  });

  const tasks = await prisma.dailyTask.findMany({ where: { ...whereUser, dateYMD } });

  const oneOffTasksTotalWeight = tasks
    .filter((t) => t.isOneOff)
    .reduce((a, t) => a + t.weight, 0);

  const totalWeight =
    activeTemplates.reduce((a, t) => a + t.weight, 0) + oneOffTasksTotalWeight;

  const doneWeight = tasks.filter(isDone).reduce((a, t) => a + t.weight, 0);

  await prisma.daySummary.upsert({
    where: { userId_dateYMD: { userId, dateYMD } },
    update: { totalWeight, doneWeight },
    create: { userId, dateYMD, totalWeight, doneWeight },
  });
}

// ─────────────────────────── routes ───────────────────────────

const auth = passport.authenticate("jwt", { session: false });

// Public routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/goals", auth, goalRoutes);
app.use("/api/stats", auth, statsRoutes);

// Protected routes
app.get(
  "/api/templates",
  auth,
  safe(async (req, res) => {
    const list = await prisma.template.findMany({
      where: { userId: req.user!.id },
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

    const order = await prisma.template.count({ where: { userId: req.user!.id, group } });
    try {
      const t = await prisma.template.create({
        data: { title, group, weight, order, userId: req.user!.id },
      });
      return res.status(201).json(t);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return res
          .status(409)
          .json({ message: "template (title, group) already exists" });
      }
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
        if (e.code === "P2002") {
          return res
            .status(409)
            .json({ message: "template (title, group) already exists" });
        }
        if (e.code === "P2025") {
          return res.status(404).json({ message: "template not found" });
        }
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
    // check ownership before deleting tasks
    const template = await prisma.template.findFirst({ where: { id, userId: req.user!.id } });
    if (!template) return res.status(404).json({ message: "template not found" });

    await prisma.dailyTask.deleteMany({ where: { templateId: id, userId: req.user!.id } });
    await prisma.template.delete({ where: { id, userId: req.user!.id } });
    return res.json({ ok: true });
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

app.post(
  "/api/daily/check",
  auth,
  safe(async (req, res) => {
    const { dateYMD, templateId, checked } = req.body || {};
    const date = dateYMD || ymdKST();
    if (!templateId) return res.status(400).json({ message: "templateId required" });

    const tpl = await prisma.template.findFirst({ where: { id: templateId, userId: req.user!.id } });
    if (!tpl) return res.status(400).json({ message: "invalid templateId" });

    const row = await prisma.dailyTask.upsert({
      where: { userId_dateYMD_templateId: { userId: req.user!.id, dateYMD: date, templateId } },
      create: {
        dateYMD: date,
        templateId: tpl.id,
        title: tpl.title,
        weight: tpl.weight,
        isOneOff: false,
        userId: req.user!.id,
        checked: !!checked,
      },
      update: { checked: !!checked },
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
    if (!title) return res.status(400).json({ message: "title required" });
    const ymd = dateYMD || ymdKST();

    const t = await prisma.dailyTask.create({
      data: { dateYMD: ymd, title, weight, isOneOff: true, userId: req.user!.id },
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
    const prev = await prisma.dailyTask.findFirst({ where: { id, userId: req.user!.id } });
    if (!prev) return res.status(404).json({ message: "Not found" });

    const updated = await prisma.dailyTask.update({
      where: { id },
      data: {
        checked: typeof checked === "boolean" ? checked : prev.checked,
        note: note ?? prev.note,
        value: typeof value === "number" ? value : prev.value,
      },
    });
    await recalcSummary(req.user!.id, updated.dateYMD);
    res.json(updated);
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
    const ym = String((req.query.ym || "").toString() || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym))
      return res.status(400).json({ message: "ym must be YYYY-MM" });

    const templates = await prisma.template.findMany({
      where: { userId: req.user!.id, defaultActive: true },
      orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });

    const { from, to, days } = monthRange(ym);
    const tasks = await prisma.dailyTask.findMany({
      where: {
        userId: req.user!.id,
        dateYMD: { gte: from, lte: to },
        templateId: { in: templates.map((t) => t.id) },
      },
    });

    const byDate: Record<string, Record<string, (typeof tasks)[number]>> = {};
    for (const t of tasks) {
      byDate[t.dateYMD] ??= {};
      if (t.templateId) byDate[t.dateYMD][t.templateId] = t;
    }

    const rows = days.map((d) => {
      let doneCount = 0;
      const cells: Record<string, { done: boolean; note?: string | null }> = {};
      for (const tpl of templates) {
        const t = byDate[d]?.[tpl.id];
        const done = t ? isDone(t) : false;
        if (done) doneCount++;
        cells[tpl.id] = { done, note: t?.note ?? null };
      }
      return { dateYMD: d, cells, doneCount, totalCount: templates.length };
    });

    res.json({
      columns: templates.map((t) => ({ id: t.id, title: t.title, group: t.group })),
      rows,
    });
  })
);

app.post(
  "/api/daily/note",
  auth,
  safe(async (req, res) => {
    const { dateYMD, templateId, note, value } = req.body;
    if (!dateYMD || !templateId) {
      return res.status(400).json({ message: "dateYMD, templateId required" });
    }

    const tpl = await prisma.template.findFirst({ where: { id: templateId, userId: req.user!.id } });
    if (!tpl) return res.status(404).json({ message: "template not found" });

    const data = {
      note: typeof note === "string" ? note : undefined,
      value: typeof value === "number" ? value : undefined,
    };

    await prisma.dailyTask.upsert({
      where: { userId_dateYMD_templateId: { userId: req.user!.id, dateYMD, templateId } },
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

    const row = await prisma.dailyTask.findFirst({
      where: { dateYMD, templateId, userId: req.user!.id },
    });
    await recalcSummary(req.user!.id, dateYMD);
    return res.json(row);
  })
);

app.delete(
  "/api/tasks/:id",
  auth,
  safe(async (req, res) => {
    const task = await prisma.dailyTask.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!task) return res.status(404).json({ message: "task not found" });

    await prisma.dailyTask.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
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
    if (!name || typeof amount !== "number" || typeof paymentDate !== "number") {
      return res.status(400).json({ message: "name, amount, paymentDate are required" });
    }
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
        data: { name: name ?? undefined, amount: amount ?? undefined, paymentDate: paymentDate ?? undefined },
      });
      res.json(updatedCost);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return res.status(404).json({ message: "Fixed cost not found" });
      }
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
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return res.status(404).json({ message: "Fixed cost not found" });
      }
      throw e;
    }
  })
);

// ───────────────────────── error handler & listen ─────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("[API ERROR]", err);
  // Augment error with user info if available
  const user = req.user ? `${req.user.email} (ID: ${req.user.id})` : "Anonymous";
  console.error(`Error occurred for user: ${user}`);
  res.status(500).json({ message: "Internal error", detail: err?.message });
});

const PORT = Number(process.env.PORT || 4001);
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));

// 404
app.use((_req, res) => res.status(404).send("Not Found"));
