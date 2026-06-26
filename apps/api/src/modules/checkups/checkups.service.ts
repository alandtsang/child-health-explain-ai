import { randomUUID } from "node:crypto";

import { CreateCheckupRequestSchema, type CheckupRecord } from "@child-health/contracts";

import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { evaluateCheckupRules } from "../rules/rules.service.js";

export function createCheckup(store: MemoryStore, input: unknown, at: Date = new Date()) {
  const request = CreateCheckupRequestSchema.parse(input);
  const checkup: CheckupRecord = {
    ...request,
    id: `checkup_${randomUUID()}`,
    childId: `child_${randomUUID()}`,
    createdAt: at.toISOString(),
    ocrFields: []
  };
  const ruleEvaluations = evaluateCheckupRules(checkup, at);

  store.checkups.push(checkup);
  store.ruleEvaluations.push(...ruleEvaluations);
  writeAuditLog(store, {
    action: "checkup.created",
    entityId: checkup.id,
    payload: {
      childId: checkup.childId,
      source: checkup.source
    },
    at
  });
  writeAuditLog(store, {
    action: "rules.evaluated",
    entityId: checkup.id,
    payload: {
      count: ruleEvaluations.length,
      summaries: ruleEvaluations.map((ruleEvaluation) => ({
        type: ruleEvaluation.type,
        level: ruleEvaluation.level,
        standardVersion: ruleEvaluation.standardVersion
      })),
      ruleEvaluationIds: ruleEvaluations.map((ruleEvaluation) => ruleEvaluation.id)
    },
    at
  });

  return { checkup, ruleEvaluations };
}
