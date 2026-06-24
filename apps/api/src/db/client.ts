import type { CheckupRecord } from "@child-health/contracts";

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
  aiDrafts: PlaceholderRecord[];
  doctorReviews: PlaceholderRecord[];
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
