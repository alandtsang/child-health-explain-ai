import { z } from "zod";

export const SexSchema = z.enum(["male", "female"]);
export type Sex = z.infer<typeof SexSchema>;

export const InputSourceSchema = z.enum(["doctor_manual", "doctor_upload", "parent_manual", "parent_upload"]);
export type InputSource = z.infer<typeof InputSourceSchema>;

export const ConfirmedMetricSchema = z.object({
  key: z.enum(["heightCm", "weightKg", "leftVision", "rightVision"]),
  value: z.number(),
  unit: z.enum(["cm", "kg", "decimal_vision"]),
  confirmedBy: z.enum(["doctor", "parent"]),
  confirmedAt: z.string().datetime()
});
export type ConfirmedMetric = z.infer<typeof ConfirmedMetricSchema>;

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
  childBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
