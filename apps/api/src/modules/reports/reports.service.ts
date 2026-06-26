import { randomUUID } from "node:crypto";

import {
  DoctorReviewSchema,
  ParentReportContentSchema,
  type AiReportDraft,
  type DoctorReview
} from "@child-health/contracts";

import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { LocalAiComposer } from "./ai-composer.adapter.js";

export class ReportNotFoundError extends Error {
  constructor(
    message: string,
    readonly code: "checkup_not_found" | "draft_not_found" | "rule_evaluations_not_found"
  ) {
    super(message);
    this.name = "ReportNotFoundError";
  }
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

  const content = new LocalAiComposer().compose(checkup, evaluations);
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
      modelVersion: draft.modelVersion
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
    reviewedByDoctorId: doctorId,
    reviewedAt: at.toISOString()
  });

  store.doctorReviews.push(review);
  writeAuditLog(store, {
    action: "doctor_review.approved",
    entityId: review.id,
    payload: {
      reportDraftId: draft.id,
      reviewedByDoctorId: doctorId
    },
    at
  });

  return review;
}
