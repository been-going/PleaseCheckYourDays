import { Request, Response } from "express";
import * as fixedCostsService from "../services/fixedCosts.service.js";

const getUserId = (req: Request): string => (req.user as { id: string }).id;

export const getFixedCosts = async (req: Request, res: Response) => {
  const costs = await fixedCostsService.getFixedCosts(getUserId(req));
  res.status(200).json(costs);
};

export const addFixedCost = async (req: Request, res: Response) => {
  const cost = await fixedCostsService.addFixedCost(getUserId(req), req.body);
  res.status(201).json(cost);
};

export const deleteFixedCost = async (req: Request, res: Response) => {
  const { id } = req.params;
  await fixedCostsService.deleteFixedCost(id, getUserId(req));
  res.status(204).send();
};
