import { z } from "zod";

export const createTemplateSchema = z.object({
  body: z.object({
    title: z.string().min(1, "제목을 입력해주세요.").max(100),
    group: z.string().max(50).optional(),
  }),
});

export const reorderTemplatesSchema = z.object({
  body: z.object({
    updates: z.array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int(),
      })
    ),
  }),
});

export const updateTemplateSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    group: z.string().max(50).optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const templateIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
