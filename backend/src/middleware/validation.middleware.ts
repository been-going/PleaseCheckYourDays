import { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";

export const validate =
  (schema: z.Schema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          // Zod v3+ 에서는 'errors' 대신 'issues'를 사용합니다.
          errors: error.issues.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        });
      }
      return next(error);
    }
  };
