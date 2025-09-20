import { Request, Response } from "express";
import * as tasksService from "../services/tasks.service.js";

import { getUserIdFromRequest } from "../utils/auth.utils.js";

export const getDailyTasks = async (req: Request, res: Response) => {
  const date = req.query.date as string;
  const tasks = await tasksService.getDailyTasks(
    getUserIdFromRequest(req),
    date
  );
  res.status(200).json({ tasks });
};

export const getTasksForRange = async (req: Request, res: Response) => {
  const from = req.query.from as string;
  const to = req.query.to as string;
  const tasks = await tasksService.getTasksForRange(
    getUserIdFromRequest(req),
    from,
    to
  );
  res.status(200).json(tasks);
};

export const addOneoff = async (req: Request, res: Response) => {
  const { title, dateYMD } = req.body;
  const task = await tasksService.addOneoff(
    getUserIdFromRequest(req),
    title,
    dateYMD
  );
  res.status(201).json(task);
};

export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const task = await tasksService.updateTask(
    id,
    getUserIdFromRequest(req),
    req.body
  );
  res.status(200).json(task);
};

export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  await tasksService.deleteTask(id, getUserIdFromRequest(req));
  res.status(204).send();
};

export const upsertTaskFromTemplate = async (req: Request, res: Response) => {
  const { templateId, dateYMD, checked } = req.body;
  const task = await tasksService.upsertTaskFromTemplate(
    getUserIdFromRequest(req),
    templateId,
    dateYMD,
    checked
  );
  res.status(200).json(task);
};

export const upsertTaskNote = async (req: Request, res: Response) => {
  const { templateId, dateYMD, note, value } = req.body;
  const task = await tasksService.upsertTaskNote(
    getUserIdFromRequest(req),
    templateId,
    dateYMD,
    note,
    value
  );
  res.status(200).json(task);
};
