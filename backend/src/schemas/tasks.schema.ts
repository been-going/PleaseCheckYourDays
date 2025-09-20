import { z } from "zod";

const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getDailyTasksSchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(YYYY_MM_DD_REGEX, "날짜는 YYYY-MM-DD 형식이어야 합니다."),
  }),
});

export const getTasksForRangeSchema = z.object({
  query: z.object({
    from: z
      .string()
      .regex(YYYY_MM_DD_REGEX, "날짜는 YYYY-MM-DD 형식이어야 합니다."),
    to: z
      .string()
      .regex(YYYY_MM_DD_REGEX, "날짜는 YYYY-MM-DD 형식이어야 합니다."),
  }),
});

export const addOneoffSchema = z.object({
  body: z.object({
    title: z.string().min(1, "제목을 입력해주세요.").max(255),
    dateYMD: z
      .string()
      .regex(YYYY_MM_DD_REGEX, "날짜는 YYYY-MM-DD 형식이어야 합니다."),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID는 필수입니다."),
  }),
  body: z.object({
    checked: z.boolean().optional(),
    note: z.string().nullable().optional(),
    value: z.number().nullable().optional(),
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "ID는 필수입니다."),
  }),
});

export const upsertTaskFromTemplateSchema = z.object({
  body: z.object({
    templateId: z.string().min(1, "템플릿 ID는 필수입니다."),
    dateYMD: z
      .string()
      .regex(YYYY_MM_DD_REGEX, "날짜는 YYYY-MM-DD 형식이어야 합니다."),
    // "true" 같은 문자열도 boolean으로 변환하도록 coerce를 사용합니다.
    checked: z.coerce.boolean(),
  }),
});

export const upsertTaskNoteSchema = z.object({
  body: z.object({
    templateId: z.string().min(1, "템플릿 ID는 필수입니다."),
    dateYMD: z
      .string()
      .regex(YYYY_MM_DD_REGEX, "날짜는 YYYY-MM-DD 형식이어야 합니다."),
    note: z.string().nullable().optional(),
    // 웹 폼에서 빈 문자열("")로 전송되는 경우를 null로 처리하고,
    // 문자열 형태의 숫자를 실제 숫자로 변환하도록 preprocess를 추가합니다.
    value: z
      .preprocess((val) => {
        if (val === "" || val === null || val === undefined) {
          return null;
        }
        if (typeof val === "string" && val.trim() !== "") {
          const num = Number(val);
          return isNaN(num) ? val : num;
        }
        return val;
      }, z.number().nullable())
      .optional(),
  }),
});
