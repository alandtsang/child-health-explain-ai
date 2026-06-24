import { z } from "zod";

export const SexSchema = z.enum(["male", "female"]);
export type Sex = z.infer<typeof SexSchema>;

export const InputSourceSchema = z.enum(["doctor_manual", "doctor_upload", "parent_manual", "parent_upload"]);
export type InputSource = z.infer<typeof InputSourceSchema>;

const ConfirmedMetricBaseSchema = z.object({
  confirmedBy: z.enum(["doctor", "parent"]),
  confirmedAt: z.string().datetime()
});

export const ConfirmedMetricSchema = z.discriminatedUnion("key", [
  ConfirmedMetricBaseSchema.extend({
    key: z.literal("heightCm"),
    value: z.number().min(30).max(220),
    unit: z.literal("cm")
  }),
  ConfirmedMetricBaseSchema.extend({
    key: z.literal("weightKg"),
    value: z.number().min(1).max(200),
    unit: z.literal("kg")
  }),
  ConfirmedMetricBaseSchema.extend({
    key: z.literal("leftVision"),
    value: z.number().min(0).max(2),
    unit: z.literal("decimal_vision")
  }),
  ConfirmedMetricBaseSchema.extend({
    key: z.literal("rightVision"),
    value: z.number().min(0).max(2),
    unit: z.literal("decimal_vision")
  })
]);
export type ConfirmedMetric = z.infer<typeof ConfirmedMetricSchema>;

const isValidDateOnly = (value: string) => {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const OcrFieldSchema = z.object({
  key: z.string(),
  rawText: z.string(),
  normalizedValue: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  page: z.number().int().min(1).optional()
});
export type OcrField = z.infer<typeof OcrFieldSchema>;

export const CreateCheckupRequestSchema = z.object({
  childName: z.string().min(1).max(40),
  childSex: SexSchema,
  childBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateOnly),
  source: InputSourceSchema,
  metrics: z.array(ConfirmedMetricSchema).min(1),
  uploadedFileUrl: z.string().url().optional()
});
export type CreateCheckupRequest = z.infer<typeof CreateCheckupRequestSchema>;

export const CheckupRecordSchema = CreateCheckupRequestSchema.extend({
  id: z.string(),
  childId: z.string(),
  createdAt: z.string().datetime(),
  ocrFields: z.array(OcrFieldSchema).default([])
});
export type CheckupRecord = z.infer<typeof CheckupRecordSchema>;
