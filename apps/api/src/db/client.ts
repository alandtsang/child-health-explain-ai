import type { AiReportDraft, CheckupRecord, DoctorReview } from "@child-health/contracts";

import type { RuleEvaluation } from "../modules/rules/rules.service.js";

export type AuditLog = {
  id: string;
  action: string;
  entityId: string;
  payload: unknown;
  createdAt: string;
};

type PlaceholderRecord = Record<string, unknown>;

export type MemoryStore = {
  checkups: CheckupRecord[];
  ruleEvaluations: RuleEvaluation[];
  aiDrafts: AiReportDraft[];
  doctorReviews: DoctorReview[];
  followUps: PlaceholderRecord[];
  auditLogs: AuditLog[];
};

export function createMemoryStore(): MemoryStore {
  return {
    checkups: [],
    ruleEvaluations: [],
    aiDrafts: [],
    doctorReviews: [],
    followUps: [],
    auditLogs: []
  };
}
