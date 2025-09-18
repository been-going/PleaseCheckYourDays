import { Request, Response } from "express";
import * as templatesService from "../services/templates.service";

const getUserId = (req: Request): string => (req.user as { id: string }).id;

export const getActiveTemplates = async (req: Request, res: Response) => {
  const templates = await templatesService.getActiveTemplates(getUserId(req));
  res.status(200).json(templates);
};

export const getAllTemplates = async (req: Request, res: Response) => {
  const templates = await templatesService.getAllTemplates(getUserId(req));
  res.status(200).json(templates);
};

export const createTemplate = async (req: Request, res: Response) => {
  const template = await templatesService.createTemplate(
    getUserId(req),
    req.body
  );
  res.status(201).json(template);
};

export const reorderTemplates = async (req: Request, res: Response) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) {
    return res
      .status(400)
      .json({ message: "updates must be an array of {id, order}." });
  }
  await templatesService.reorderTemplates(getUserId(req), updates);
  res.status(200).json({ message: "Reordered successfully." });
};

export const updateTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const template = await templatesService.updateTemplate(
    id,
    getUserId(req),
    req.body
  );
  res.status(200).json(template);
};

export const deleteTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  await templatesService.softDeleteTemplate(id, getUserId(req));
  res.status(204).send();
};

export const getTrash = async (req: Request, res: Response) => {
  const templates = await templatesService.getDeletedTemplates(getUserId(req));
  res.status(200).json(templates);
};

export const restoreTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const template = await templatesService.restoreTemplate(id, getUserId(req));
  res.status(200).json(template);
};

export const permanentDelete = async (req: Request, res: Response) => {
  const { id } = req.params;
  await templatesService.permanentDeleteTemplate(id, getUserId(req));
  res.status(204).send();
};
