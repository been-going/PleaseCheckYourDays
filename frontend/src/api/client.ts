import axiosInstance from "./axios";

// ─────────────────────────── User ───────────────────────────

export interface User {
  id: string;
  email: string;
}

// ─────────────────────────── Auth ───────────────────────────

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<{ message: string }> {
  const { data } = await axiosInstance.post("/auth/login", credentials);
  return data;
}

export async function signup(credentials: { email: string; password: string }) {
  const { data } = await axiosInstance.post("/auth/signup", credentials);
  return data;
}

export async function logout(): Promise<void> {
  await axiosInstance.post("/auth/logout");
}

export async function getMe(): Promise<{ user: User }> {
  const { data } = await axiosInstance.get("/auth/me");
  return data;
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
}

export async function getDailyTasks(
  date: string // YYYY-MM-DD
): Promise<{ tasks: DailyTask[] }> {
  const { data } = await axiosInstance.get(`/tasks?date=${date}`);
  return data;
}

export async function getTasksForRange(
  from: string,
  to: string
): Promise<DailyTask[]> {
  const { data } = await axiosInstance.get(
    `/tasks/range?from=${from}&to=${to}`
  );
  return data;
}

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
  const { data } = await axiosInstance.get("/fixed-costs");
  return data;
}

export async function addFixedCost(data: {
  name: string;
  amount: number;
  paymentDate: number;
}): Promise<FixedCost> {
  const { data: responseData } = await axiosInstance.post("/fixed-costs", data);
  return responseData;
}

export async function deleteFixedCost(id: string): Promise<void> {
  await axiosInstance.delete(`/fixed-costs/${id}`);
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
  const { data } = await axiosInstance.get(
    `/dashboard/routines?${params.toString()}`
  );
  return data;
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
  const { data } = await axiosInstance.get(`/routines/${id}`);
  return data;
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
  const { data } = await axiosInstance.get("/templates");
  return data;
}

export async function getAllTemplates(): Promise<Template[]> {
  const { data } = await axiosInstance.get("/templates/all");
  return data;
}

export async function createTemplate(data: {
  title: string;
  group: string;
}): Promise<Template> {
  const { data: responseData } = await axiosInstance.post("/templates", data);
  return responseData;
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, "id" | "createdAt" | "updatedAt" | "isArchived">>
): Promise<Template> {
  const { data: responseData } = await axiosInstance.put(
    `/templates/${id}`,
    data
  );
  return responseData;
}

export async function reorderTemplates(
  updates: { id: string; order: number }[]
): Promise<void> {
  await axiosInstance.patch("/templates/reorder", { updates });
}

export async function deleteTemplate(id: string): Promise<void> {
  await axiosInstance.delete(`/templates/${id}`);
}

export async function getTrash(): Promise<Template[]> {
  const { data } = await axiosInstance.get("/templates/trash");
  return data;
}

export async function restoreTemplate(id: string): Promise<Template> {
  const { data } = await axiosInstance.post(`/templates/${id}/restore`);
  return data;
}

export async function permanentDelete(id: string): Promise<void> {
  await axiosInstance.delete(`/templates/${id}/permanent`);
}

// ─────────────────────────── Goals ───────────────────────────

export interface Goal {
  id: string;
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
  const { data } = await axiosInstance.get("/goals");
  return data;
}

export async function createGoal(data: {
  title: string;
  description?: string;
  startDate: string;
  targetDate: string;
}): Promise<Goal> {
  const { data: responseData } = await axiosInstance.post("/goals", data);
  return responseData;
}

export async function updateGoal(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    targetDate: string;
    progress: number;
    isAchieved: boolean;
  }>
): Promise<Goal> {
  const { data: responseData } = await axiosInstance.put(`/goals/${id}`, data);
  return responseData;
}

export async function deleteGoal(id: string): Promise<void> {
  await axiosInstance.delete(`/goals/${id}`);
}

// New functions for DailyTask operations
export async function addOneoff(data: {
  title: string;
  dateYMD: string;
}): Promise<DailyTask> {
  const { data: responseData } = await axiosInstance.post(
    "/tasks/oneoff",
    data
  );
  return responseData;
}

export async function updateTask(
  id: string,
  data: Partial<{ checked: boolean; note: string; value: number | null }>
): Promise<DailyTask> {
  // Note: The backend route is /api/tasks/:id
  const { data: responseData } = await axiosInstance.patch(
    `/tasks/${id}`,
    data
  );
  return responseData;
}

export async function upsertTaskFromTemplate(data: {
  dateYMD: string;
  templateId: string;
  checked: boolean;
  note?: string;
  value?: number | null;
}): Promise<DailyTask> {
  const { data: responseData } = await axiosInstance.post("/daily/check", data);
  return responseData;
}

export async function deleteTask(id: string): Promise<void> {
  // Note: The backend route is /api/tasks/:id
  await axiosInstance.delete(`/tasks/${id}`);
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
  const { data } = await axiosInstance.get(`/summaries?from=${from}&to=${to}`);
  return data;
}

export async function upsertTaskNote(data: {
  dateYMD: string;
  templateId: string;
  note?: string | null;
  value?: number | null;
}): Promise<DailyTask> {
  const { data: responseData } = await axiosInstance.post("/daily/note", data);
  return responseData;
}
