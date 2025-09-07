import { guestStoreApi } from './guestStore';
import { DailyTask, FixedCost, Goal, Template, DailySummary } from './client';

// This file mimics the signature of client.ts but uses the in-memory guest store.

export const getDailyTasks = async (date: string): Promise<{ dateYMD: string; tasks: DailyTask[] }> => {
  return guestStoreApi.getDailyTasks(date);
};

export const getGoals = async (): Promise<Goal[]> => {
  return guestStoreApi.getGoals();
};

export const createGoal = async (data: { title: string; description?: string; startDate: string; targetDate: string }): Promise<Goal> => {
  return guestStoreApi.createGoal(data);
};

export const getFixedCosts = async (): Promise<FixedCost[]> => {
  return guestStoreApi.getFixedCosts();
};

export const addFixedCost = async (data: { name: string; amount: number; paymentDate: number }): Promise<FixedCost> => {
  return guestStoreApi.addFixedCost(data);
};

export const getTemplates = async (): Promise<Template[]> => {
  return guestStoreApi.getTemplates();
};

export const createTemplate = async (data: { title: string; group: 'MORNING' | 'EXECUTE' | 'EVENING'; }): Promise<Template> => {
  return guestStoreApi.createTemplate(data);
};

export const updateTemplate = async (id: string, data: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Template> => {
  return guestStoreApi.updateTemplate(id, data);
};

export const deleteTemplate = async (id: string): Promise<{}> => {
  return guestStoreApi.deleteTemplate(id);
};

export const addOneoff = async (data: { title: string; dateYMD: string }): Promise<DailyTask> => {
    return guestStoreApi.addOneoff(data);
};

export const updateTask = async (id: string, data: { checked?: boolean; note?: string; value?: number }): Promise<DailyTask> => {
    return guestStoreApi.updateTask(id, data);
};

export const upsertTaskFromTemplate = async (data: { dateYMD: string; templateId: string; checked: boolean; note?: string; value?: number }): Promise<DailyTask> => {
    return guestStoreApi.upsertTaskFromTemplate(data);
};

export const deleteTask = async (id: string): Promise<{}> => {
    return guestStoreApi.deleteTask(id);
};

export const getDailySummaries = async (from: string, to: string): Promise<DailySummary[]> => {
    return guestStoreApi.getDailySummaries(from, to);
};

// The generic `api` function is intentionally not implemented for the guest client.
// All components should be refactored to use the named functions.