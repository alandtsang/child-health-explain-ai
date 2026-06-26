import type { FollowUpTask } from "@child-health/contracts";

import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";
import type { RuleEvaluation } from "../rules/rules.service.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function followUpId(ruleEvaluationId: string): string {
  return `followup_${ruleEvaluationId.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

type FollowUpRuleEvaluation = RuleEvaluation & { defaultFollowUpDays: number };

function needsFollowUp(evaluation: RuleEvaluation): evaluation is FollowUpRuleEvaluation {
  return (
    evaluation.defaultFollowUpDays !== null &&
    evaluation.level !== "normal" &&
    evaluation.level !== "unable_to_evaluate"
  );
}

export function createFollowUpsForCheckup(
  store: MemoryStore,
  checkupId: string,
  at: Date = new Date()
): FollowUpTask[] {
  const createdAt = at.toISOString();
  const tasks = store.ruleEvaluations
    .filter((evaluation) => evaluation.checkupId === checkupId)
    .filter(needsFollowUp)
    .map((evaluation) => {
      const id = followUpId(evaluation.id);
      const existingTask = store.followUps.find((task) => task.ruleEvaluationId === evaluation.id || task.id === id);

      if (existingTask) {
        return existingTask;
      }

      const plannedAt = addDays(at, evaluation.defaultFollowUpDays).toISOString();
      const task: FollowUpTask = {
        id,
        checkupId,
        ruleEvaluationId: evaluation.id,
        reason: `${evaluation.recommendedDepartment} ${evaluation.type} ${evaluation.level} 需要随访`,
        plannedAt,
        channel: "wechat",
        status: "pending",
        createdAt
      };

      store.followUps.push(task);
      writeAuditLog(store, {
        action: "followup.created",
        entityId: task.id,
        payload: {
          checkupId,
          ruleEvaluationId: evaluation.id,
          type: evaluation.type,
          level: evaluation.level,
          recommendedDepartment: evaluation.recommendedDepartment,
          reason: task.reason,
          status: task.status,
          defaultFollowUpDays: evaluation.defaultFollowUpDays,
          plannedAt: task.plannedAt,
          channel: task.channel
        },
        at
      });

      return task;
    });

  return tasks;
}
