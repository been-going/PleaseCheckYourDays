import { guestStoreApi } from './guestStore';
// This file mimics the signature of client.ts but uses the in-memory guest store.
export const getDailyTasks = async (date) => {
    return guestStoreApi.getDailyTasks(date);
};
export const getGoals = async () => {
    return guestStoreApi.getGoals();
};
export const createGoal = async (data) => {
    return guestStoreApi.createGoal(data);
};
export const getFixedCosts = async () => {
    return guestStoreApi.getFixedCosts();
};
export const addFixedCost = async (data) => {
    return guestStoreApi.addFixedCost(data);
};
export const getTemplates = async () => {
    return guestStoreApi.getTemplates();
};
export const createTemplate = async (data) => {
    return guestStoreApi.createTemplate(data);
};
export const updateTemplate = async (id, data) => {
    return guestStoreApi.updateTemplate(id, data);
};
export const deleteTemplate = async (id) => {
    return guestStoreApi.deleteTemplate(id);
};
export const addOneoff = async (data) => {
    return guestStoreApi.addOneoff(data);
};
export const updateTask = async (id, data) => {
    return guestStoreApi.updateTask(id, data);
};
export const upsertTaskFromTemplate = async (data) => {
    return guestStoreApi.upsertTaskFromTemplate(data);
};
export const deleteTask = async (id) => {
    return guestStoreApi.deleteTask(id);
};
// The generic `api` function is intentionally not implemented for the guest client.
// All components should be refactored to use the named functions.
