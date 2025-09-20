import { Request, Response } from "express";
import * as fixedCostsService from "../services/fixedCosts.service.js";

import { getUserIdFromRequest } from "../utils/auth.utils.js";

export const getFixedCosts = async (req: Request, res: Response) => {
  const costs = await fixedCostsService.getFixedCosts(
    getUserIdFromRequest(req)
  );
  res.status(200).json(costs);
};

export const addFixedCost = async (req: Request, res: Response) => {
  const cost = await fixedCostsService.addFixedCost(
    getUserIdFromRequest(req),
    req.body
  );
  res.status(201).json(cost);
};

export const deleteFixedCost = async (req: Request, res: Response) => {
  const { id } = req.params;
  await fixedCostsService.deleteFixedCost(id, getUserIdFromRequest(req));
  res.status(204).send();
};
