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

const unableRequest = {
  ...validRequest,
  childBirthDate: "2010-06-24"
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
      entityId: draft.id,
      payload: {
        ruleEvaluationIds: store.ruleEvaluations.map((evaluation) => evaluation.id),
        ruleSummaries: store.ruleEvaluations.map((evaluation) => ({
          type: evaluation.type,
          level: evaluation.level,
          standardVersion: evaluation.standardVersion
        })),
        contentValidation: {
          valid: true
        }
      }
    });
  });

  it("creates limited report content when every rule is unable to evaluate", () => {
    const store = createMemoryStore();
    const { checkup } = createCheckup(store, unableRequest, createdAt);

    const draft = createReportDraft(store, checkup.id, createdAt);
    const contentText = Object.values(draft.content).flat().join(" ");

    expect(contentText).not.toContain("未发现需要重点干预的异常结果");
    expect(contentText).not.toContain("未见明显异常");
    expect(contentText).toMatch(/无法评估|暂无法评估/);
    expect(draft.content.indicatorExplanation).toContain("出生日期无效或年龄不在支持范围");
    expect(draft.content.departmentAdvice).toContain("儿童保健科");
    expect(draft.content.departmentAdvice).toContain("眼科");
  });

  it("blocks draft creation when MVP rule evaluations are incomplete", () => {
    const store = createMemoryStore();
    const { checkup } = createCheckup(store, validRequest, createdAt);
    store.ruleEvaluations = store.ruleEvaluations.filter((evaluation) => evaluation.type !== "vision_abnormality");

    expect(() => createReportDraft(store, checkup.id, createdAt)).toThrow(/Missing rule evaluations: vision_abnormality/);
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
      entityId: review.id,
      payload: {
        doctorId: "doctor_1",
        draftId: draft.id,
        contentChanged: true,
        approvedContentSectionKeys: Object.keys(editedContent)
      }
    });
  });

  it("rejects blank doctor IDs at service level", () => {
    const store = createMemoryStore();
    const { checkup } = createCheckup(store, validRequest, createdAt);
    const draft = createReportDraft(store, checkup.id, createdAt);

    expect(() => approveDoctorReview(store, draft.id, "   ", draft.content, createdAt)).toThrow(/doctorId is required/);
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

  it("returns 404 for report draft creation from a missing checkup", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const response = await app.inject({
        method: "POST",
        url: "/checkups/checkup_missing/report-drafts"
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: "not_found",
        message: "Checkup not found"
      });
    } finally {
      await app.close();
    }
  });

  it("returns 409 when report draft creation is missing MVP rule evaluations", async () => {
    const store = createMemoryStore();
    const app = await buildApp(store);

    try {
      const { checkup } = createCheckup(store, validRequest, createdAt);
      store.ruleEvaluations = store.ruleEvaluations.filter((evaluation) => evaluation.type !== "growth_delay");

      const response = await app.inject({
        method: "POST",
        url: `/checkups/${checkup.id}/report-drafts`
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: "conflict",
        message: "Missing rule evaluations: growth_delay",
        code: "rule_evaluations_incomplete",
        missingTypes: ["growth_delay"]
      });
    } finally {
      await app.close();
    }
  });

  it("returns normalized 400 for blank doctor IDs", async () => {
    const store = createMemoryStore();
    const app = await buildApp(store);

    try {
      const { checkup } = createCheckup(store, validRequest, createdAt);
      const draft = createReportDraft(store, checkup.id, createdAt);

      const response = await app.inject({
        method: "POST",
        url: `/report-drafts/${draft.id}/doctor-review`,
        payload: {
          doctorId: "   ",
          editedContent: draft.content
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
