import { describe, expect, it } from "vitest";

import { ParentReportContentSchema } from "@child-health/contracts";

import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/db/client.js";
import { createCheckup } from "../src/modules/checkups/checkups.service.js";
import { approveDoctorReview, createReportDraft } from "../src/modules/reports/reports.service.js";

const confirmedAt = "2026-06-24T08:00:00.000Z";
const createdAt = new Date(confirmedAt);

const validRequest = {
  childName: "小明",
  childSex: "male",
  childBirthDate: "2020-06-24",
  source: "doctor_manual",
  metrics: [
    {
      key: "heightCm",
      value: 105,
      unit: "cm",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "weightKg",
      value: 24,
      unit: "kg",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "leftVision",
      value: 0.6,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "rightVision",
      value: 0.7,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt
    }
  ]
} as const;

describe("report services", () => {
  it("creates a local AI report draft with department advice and poster bullets", () => {
    const store = createMemoryStore();
    const { checkup } = createCheckup(store, validRequest, createdAt);

    const draft = createReportDraft(store, checkup.id, createdAt);

    expect(draft.modelProvider).toBe("local");
    expect(draft.modelVersion).toBe("local-template-2026-06");
    expect(store.aiDrafts).toEqual([draft]);
    expect(draft.content.departmentAdvice).toContain("儿童保健科");
    expect(draft.content.posterBullets.length).toBeGreaterThanOrEqual(2);
    expect(store.auditLogs.at(-1)).toMatchObject({
      action: "ai_report.created",
      entityId: draft.id
    });
  });

  it("approves doctor review without changing stored rule levels", () => {
    const store = createMemoryStore();
    const { checkup } = createCheckup(store, validRequest, createdAt);
    const originalLevels = store.ruleEvaluations.map((evaluation) => ({
      id: evaluation.id,
      level: evaluation.level
    }));
    const draft = createReportDraft(store, checkup.id, createdAt);
    const editedContent = ParentReportContentSchema.parse({
      ...draft.content,
      summary: "医生已复核：建议按计划复诊，并结合家庭干预。"
    });

    const review = approveDoctorReview(store, draft.id, "doctor_1", editedContent, createdAt);

    expect(review).toMatchObject({
      reportDraftId: draft.id,
      status: "approved",
      reviewedByDoctorId: "doctor_1",
      reviewedAt: confirmedAt,
      editedContent
    });
    expect(store.ruleEvaluations.map((evaluation) => ({ id: evaluation.id, level: evaluation.level }))).toEqual(
      originalLevels
    );
    expect(store.auditLogs.at(-1)).toMatchObject({
      action: "doctor_review.approved",
      entityId: review.id
    });
  });
});

describe("report routes", () => {
  it("creates a report draft for an existing checkup", async () => {
    const store = createMemoryStore();
    const app = await buildApp(store);

    try {
      const { checkup } = createCheckup(store, validRequest, createdAt);

      const response = await app.inject({
        method: "POST",
        url: `/checkups/${checkup.id}/report-drafts`
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        checkupId: checkup.id,
        modelProvider: "local",
        modelVersion: "local-template-2026-06"
      });
      expect(store.aiDrafts).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it("returns 404 for doctor review of a missing draft", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const response = await app.inject({
        method: "POST",
        url: "/report-drafts/draft_missing/doctor-review",
        payload: {
          doctorId: "doctor_1",
          editedContent: {
            summary: "x"
          }
        }
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: "not_found",
        message: "Report draft not found"
      });
    } finally {
      await app.close();
    }
  });

  it("returns normalized 400 for invalid doctor edited content", async () => {
    const store = createMemoryStore();
    const app = await buildApp(store);

    try {
      const { checkup } = createCheckup(store, validRequest, createdAt);
      const draft = createReportDraft(store, checkup.id, createdAt);

      const response = await app.inject({
        method: "POST",
        url: `/report-drafts/${draft.id}/doctor-review`,
        payload: {
          doctorId: "doctor_1",
          editedContent: {
            ...draft.content,
            posterBullets: ["太短"]
          }
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "validation_error"
      });
    } finally {
      await app.close();
    }
  });
});
