const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

export async function api<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `${res.status} ${res.statusText}`);
  }

  if (path.includes("/login")) {
    const body = await res.json();
    return body.token as T;
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return res.json();
  }

  return {} as T;
}

// ─────────────────────────── Auth ───────────────────────────

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<string> {
  return api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function signup(credentials: {
  email: string;
  password: string;
}): Promise<{ message: string; userId: string }> {
  return api("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export interface DailyTask {
  id: string;
  dateYMD: string;
  title: string;
  checked: boolean;
  note: string | null;
  value: number | null;
  weight: number;
  isOneOff: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  templateId: string | null;
  template?: {
    group: string;
  };
}

export async function getDailyTasks(
  date: string // YYYY-MM-DD
): Promise<{ dateYMD: string; tasks: DailyTask[] }> {
  return api(`/api/daily/tasks?date=${date}`);
}

// --- 여기를 추가했습니다! ---
export async function getTasksForRange(
  from: string,
  to: string
): Promise<DailyTask[]> {
  return api(`/api/daily/tasks/range?from=${from}&to=${to}`);
}
// --------------------------

// ─────────────────────────── Fixed Costs ───────────────────────────

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  paymentDate: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export async function getFixedCosts(): Promise<FixedCost[]> {
  return api("/api/fixed-costs");
}

export async function addFixedCost(data: {
  name: string;
  amount: number;
  paymentDate: number;
}): Promise<FixedCost> {
  return api("/api/fixed-costs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFixedCost(
  id: string,
  data: Partial<{ name: string; amount: number; paymentDate: number }>
): Promise<FixedCost> {
  return api(`/api/fixed-costs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFixedCost(id: string): Promise<{ ok: boolean }> {
  return api(`/api/fixed-costs/${id}`, {
    method: "DELETE",
  });
}

// ─────────────────────────── Stats ───────────────────────────

export interface StatsData {
  taskStats: {
    total: number;
    completed: number;
    completionRate: number;
  };
  categoryStats: Array<{ name: string; count: number }>;
  fixedCostStats: {
    total: number;
    count: number;
  };
}

export async function getStats(
  year: number,
  month: number
): Promise<StatsData> {
  return api(`/api/stats?year=${year}&month=${month}`);
}

// ─────────────────────────── Dashboard - Routines ───────────────────────────

export interface RoutineStat {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  successRate: number;
  totalDays: number;
  doneCount: number;
  isArchived: boolean;
}

export async function getRoutineStats(
  sortBy: string = "rate_desc",
  limit?: number
): Promise<RoutineStat[]> {
  const params = new URLSearchParams({ sortBy });
  if (limit !== undefined) {
    params.append("limit", String(limit));
  }
  return api(`/api/dashboard/routines?${params.toString()}`);
}

export interface RoutineDetail {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  completionData: {
    date: string;
    level: number;
    note: string | null;
    value: number | null;
  }[];
}

export async function getRoutineDetail(id: string): Promise<RoutineDetail> {
  return api(`/api/routines/${id}`);
}

// ─────────────────────────── Templates ───────────────────────────

export interface Template {
  id: string;
  title: string;
  group: "MORNING" | "EXECUTE" | "EVENING";
  weight: number;
  defaultActive: boolean;
  order: number;
  enableValue: boolean;
  enableNote: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  isArchived: boolean;
}

export async function getTemplates(): Promise<Template[]> {
  return api("/api/templates");
}

export async function getAllTemplates(): Promise<Template[]> {
  return api("/api/templates/all");
}

export async function createTemplate(data: {
  title: string;
  group: string;
}): Promise<Template> {
  return api("/api/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, "id" | "createdAt" | "updatedAt" | "isArchived">>
): Promise<Template> {
  return api(`/api/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<{}> {
  return api(`/api/templates/${id}`, {
    method: "DELETE",
  });
}

export async function getArchivedTemplates(): Promise<Template[]> {
  return api("/api/templates/archived");
}

export async function restoreTemplate(id: string): Promise<Template> {
  return api(`/api/templates/${id}/restore`, {
    method: "PUT",
  });
}

export async function deleteTemplatePermanently(
  id: string
): Promise<{ ok: boolean }> {
  return api(`/api/templates/${id}/permanent`, {
    method: "DELETE",
  });
}

// ─────────────────────────── Goals ───────────────────────────

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  startDate: string; // ISO date string
  targetDate: string; // ISO date string
  progress: number;
  isAchieved: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  userId: string;
}

export async function getGoals(): Promise<Goal[]> {
  return api("/api/goals");
}

export async function createGoal(data: {
  title: string;
  description?: string;
  startDate: string;
  targetDate: string;
}): Promise<Goal> {
  return api("/api/goals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGoal(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    targetDate: string;
    progress: number;
    isAchieved: boolean;
  }>
): Promise<Goal> {
  return api(`/api/goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(id: number): Promise<{ ok: boolean }> {
  return api(`/api/goals/${id}`, {
    method: "DELETE",
  });
}

// New functions for DailyTask operations
export async function addOneoff(data: {
  title: string;
  dateYMD: string;
}): Promise<DailyTask> {
  return api("/api/daily/oneoff", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: string,
  data: Partial<{ checked: boolean; note: string; value: number | null }>
): Promise<DailyTask> {
  return api(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function upsertTaskFromTemplate(data: {
  dateYMD: string;
  templateId: string;
  checked: boolean;
  note?: string;
  value?: number | null;
}): Promise<DailyTask> {
  return api("/api/daily/check", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createTask(data: {
  dateYMD: string;
  templateId: string;
  checked: boolean;
  note?: string;
  value?: number;
}): Promise<DailyTask> {
  return upsertTaskFromTemplate(data);
}

export async function deleteTask(id: string): Promise<{}> {
  return api(`/api/tasks/${id}`, {
    method: "DELETE",
  });
}

// ─────────────────────────── Daily Summaries ───────────────────────────

export interface DailySummary {
  dateYMD: string;
  totalWeight: number;
  doneWeight: number;
}

export async function getDailySummaries(
  from: string,
  to: string
): Promise<DailySummary[]> {
  return api(`/api/summaries?from=${from}&to=${to}`);
}

// --- NEWLY ADDED FOR REFACTORING ---

export async function initToday(): Promise<{
  dateYMD: string;
  tasks: DailyTask[];
  summary: DailySummary;
}> {
  return api("/api/daily/init", { method: "POST" });
}

export async function upsertTaskNote(data: {
  dateYMD: string;
  templateId: string;
  note: string;
  value?: number | null;
}): Promise<DailyTask> {
  return api("/api/daily/note", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
