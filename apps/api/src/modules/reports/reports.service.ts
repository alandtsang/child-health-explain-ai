import { randomUUID } from "node:crypto";

import {
  DoctorReviewSchema,
  ParentReportContentSchema,
  type AbnormalityType,
  type AiReportDraft,
  type DoctorReview
} from "@child-health/contracts";

import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { LocalAiComposer } from "./ai-composer.adapter.js";

const MVP_RULE_TYPES: AbnormalityType[] = ["overweight_obesity", "growth_delay", "vision_abnormality"];

export class ReportNotFoundError extends Error {
  constructor(
    message: string,
    readonly code: "checkup_not_found" | "draft_not_found" | "rule_evaluations_not_found"
  ) {
    super(message);
    this.name = "ReportNotFoundError";
  }
}

export class ReportConflictError extends Error {
  constructor(
    message: string,
    readonly code: "rule_evaluations_incomplete",
    readonly missingTypes: AbnormalityType[]
  ) {
    super(message);
    this.name = "ReportConflictError";
  }
}

export class ReportValidationError extends Error {
  constructor(
    message: string,
    readonly issues: { path: string[]; message: string }[]
  ) {
    super(message);
    this.name = "ReportValidationError";
  }
}

function missingRuleTypes(evaluations: readonly { type: AbnormalityType }[]): AbnormalityType[] {
  const presentTypes = new Set(evaluations.map((evaluation) => evaluation.type));

  return MVP_RULE_TYPES.filter((type) => !presentTypes.has(type));
}

function assertDoctorId(doctorId: string): string {
  const trimmedDoctorId = doctorId.trim();

  if (trimmedDoctorId.length === 0) {
    throw new ReportValidationError("doctorId is required", [
      { path: ["doctorId"], message: "doctorId is required" }
    ]);
  }

  return trimmedDoctorId;
}

export function createReportDraft(store: MemoryStore, checkupId: string, at: Date = new Date()): AiReportDraft {
  const checkup = store.checkups.find((item) => item.id === checkupId);

  if (!checkup) {
    throw new ReportNotFoundError("Checkup not found", "checkup_not_found");
  }

  const evaluations = store.ruleEvaluations.filter((evaluation) => evaluation.checkupId === checkupId);

  if (evaluations.length === 0) {
    throw new ReportNotFoundError("Rule evaluations not found", "rule_evaluations_not_found");
  }

  const missingTypes = missingRuleTypes(evaluations);

  if (missingTypes.length > 0) {
    throw new ReportConflictError(
      `Missing rule evaluations: ${missingTypes.join(", ")}`,
      "rule_evaluations_incomplete",
      missingTypes
    );
  }

  const content = new LocalAiComposer().compose(checkup, evaluations);
  const contentValidation = ParentReportContentSchema.safeParse(content);
  const draft: AiReportDraft = {
    id: `draft_${randomUUID()}`,
    checkupId,
    modelProvider: "local",
    modelVersion: "local-template-2026-06",
    content,
    createdAt: at.toISOString()
  };

  store.aiDrafts.push(draft);
  writeAuditLog(store, {
    action: "ai_report.created",
    entityId: draft.id,
    payload: {
      checkupId,
      modelProvider: draft.modelProvider,
      modelVersion: draft.modelVersion,
      ruleEvaluationIds: evaluations.map((evaluation) => evaluation.id),
      ruleSummaries: evaluations.map((evaluation) => ({
        type: evaluation.type,
        level: evaluation.level,
        standardVersion: evaluation.standardVersion
      })),
      contentValidation: {
        valid: contentValidation.success
      }
    },
    at
  });

  return draft;
}

export function approveDoctorReview(
  store: MemoryStore,
  draftId: string,
  doctorId: string,
  editedContent: unknown,
  at: Date = new Date()
): DoctorReview {
  const reviewedByDoctorId = assertDoctorId(doctorId);
  const draft = store.aiDrafts.find((item) => item.id === draftId);

  if (!draft) {
    throw new ReportNotFoundError("Report draft not found", "draft_not_found");
  }

  const parsedContent = ParentReportContentSchema.parse(editedContent);
  const review = DoctorReviewSchema.parse({
    id: `review_${randomUUID()}`,
    reportDraftId: draft.id,
    status: "approved",
    editedContent: parsedContent,
    reviewedByDoctorId,
    reviewedAt: at.toISOString()
  });

  store.doctorReviews.push(review);
  writeAuditLog(store, {
    action: "doctor_review.approved",
    entityId: review.id,
    payload: {
      doctorId: reviewedByDoctorId,
      draftId: draft.id,
      reportDraftId: draft.id,
      reviewedByDoctorId,
      contentChanged: JSON.stringify(parsedContent) !== JSON.stringify(draft.content),
      approvedContentSectionKeys: Object.keys(parsedContent)
    },
    at
  });

  return review;
}
