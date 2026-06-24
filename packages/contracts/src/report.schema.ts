import { z } from "zod";

export const AbnormalityTypeSchema = z.enum(["overweight_obesity", "growth_delay", "vision_abnormality"]);
export type AbnormalityType = z.infer<typeof AbnormalityTypeSchema>;

export const AbnormalityLevelSchema = z.enum(["normal", "mild", "moderate", "severe", "unable_to_evaluate"]);
export type AbnormalityLevel = z.infer<typeof AbnormalityLevelSchema>;

export const RuleEvaluationSchema = z.object({
  id: z.string(),
  checkupId: z.string(),
  type: AbnormalityTypeSchema,
  level: AbnormalityLevelSchema,
  standardVersion: z.string(),
  evidence: z.array(z.string()),
  recommendedDepartment: z.string(),
  interventionTags: z.array(z.string()),
  defaultFollowUpDays: z.number().int().positive().nullable()
});
export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;

export const ParentReportContentSchema = z.object({
  summary: z.string().min(1),
  indicatorExplanation: z.string().min(1),
  abnormalMeaning: z.string().min(1),
  departmentAdvice: z.string().min(1),
  homeIntervention: z.string().min(1),
  followUpAdvice: z.string().min(1),
  posterTitle: z.string().min(1).max(30),
  posterBullets: z.array(z.string().min(1).max(40)).min(2).max(4)
});
export type ParentReportContent = z.infer<typeof ParentReportContentSchema>;

export const AiReportDraftSchema = z.object({
  id: z.string(),
  checkupId: z.string(),
  modelProvider: z.string(),
  modelVersion: z.string(),
  content: ParentReportContentSchema,
  createdAt: z.string().datetime()
});
export type AiReportDraft = z.infer<typeof AiReportDraftSchema>;

export const DoctorReviewSchema = z.object({
  id: z.string(),
  reportDraftId: z.string(),
  status: z.enum(["draft", "approved", "sent"]),
  editedContent: ParentReportContentSchema,
  reviewedByDoctorId: z.string(),
  reviewedAt: z.string().datetime().nullable()
});
export type DoctorReview = z.infer<typeof DoctorReviewSchema>;
