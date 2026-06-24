import { z } from "zod";

export const FollowUpTaskSchema = z.object({
  id: z.string(),
  checkupId: z.string(),
  ruleEvaluationId: z.string(),
  reason: z.string(),
  plannedAt: z.string().datetime(),
  channel: z.enum(["wechat", "sms"]),
  status: z.enum(["pending", "sent", "failed", "completed", "cancelled"]),
  createdAt: z.string().datetime()
});
export type FollowUpTask = z.infer<typeof FollowUpTaskSchema>;
