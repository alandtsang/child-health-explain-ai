import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/db/client.js";
import { createCheckup } from "../src/modules/checkups/checkups.service.js";

const confirmedAt = "2026-06-24T08:00:00.000Z";
const createdAt = new Date(confirmedAt);

const validRequest = {
  childName: "Mina",
  childSex: "female",
  childBirthDate: "2020-06-24",
  source: "doctor_manual",
  metrics: [
    {
      key: "heightCm",
      value: 110,
      unit: "cm",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "weightKg",
      value: 22,
      unit: "kg",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "leftVision",
      value: 0.8,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "rightVision",
      value: 0.9,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt
    }
  ]
} as const;

describe("createCheckup", () => {
  it("stores confirmed metrics and evaluates three rules", () => {
    const store = createMemoryStore();

    const result = createCheckup(store, validRequest, createdAt);

    expect(store.checkups).toEqual([result.checkup]);
    expect(result.checkup.metrics).toEqual(validRequest.metrics);
    expect(result.checkup.createdAt).toBe(confirmedAt);
    expect(result.checkup.ocrFields).toEqual([]);
    expect(result.ruleEvaluations).toHaveLength(3);
    expect(store.ruleEvaluations).toEqual(result.ruleEvaluations);
    expect(result.ruleEvaluations.map((item) => item.id)).toEqual([
      `${result.checkup.id}:rule:overweight_obesity`,
      `${result.checkup.id}:rule:growth_delay`,
      `${result.checkup.id}:rule:vision_abnormality`
    ]);
  });

  it("writes audit logs for checkup creation and rule evaluation", () => {
    const store = createMemoryStore();

    const result = createCheckup(store, validRequest, createdAt);

    expect(store.auditLogs).toHaveLength(2);
    expect(store.auditLogs.map((entry) => entry.action)).toEqual(["checkup.created", "rules.evaluated"]);
    expect(store.auditLogs.map((entry) => entry.entityId)).toEqual([result.checkup.id, result.checkup.id]);
    expect(store.auditLogs.every((entry) => entry.createdAt === confirmedAt)).toBe(true);
    expect(store.auditLogs[1]?.payload).toEqual({
      count: 3,
      summaries: result.ruleEvaluations.map((ruleEvaluation) => ({
        type: ruleEvaluation.type,
        level: ruleEvaluation.level,
        standardVersion: ruleEvaluation.standardVersion
      })),
      ruleEvaluationIds: result.ruleEvaluations.map((ruleEvaluation) => ruleEvaluation.id)
    });
  });

  it("returns a validation error for invalid confirmed metrics", () => {
    const store = createMemoryStore();

    expect(() =>
      createCheckup(
        store,
        {
          ...validRequest,
          metrics: [{ ...validRequest.metrics[0], unit: "kg" }]
        },
        createdAt
      )
    ).toThrow(ZodError);
    expect(store.checkups).toHaveLength(0);
    expect(store.ruleEvaluations).toHaveLength(0);
    expect(store.auditLogs).toHaveLength(0);
  });
});

describe("checkup routes", () => {
  it("creates a checkup and returns three rule evaluations", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const response = await app.inject({
        method: "POST",
        url: "/checkups",
        payload: validRequest
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        checkup: {
          childName: validRequest.childName,
          source: validRequest.source,
          metrics: validRequest.metrics,
          ocrFields: []
        },
        ruleEvaluations: expect.arrayContaining([
          expect.objectContaining({ type: "overweight_obesity" }),
          expect.objectContaining({ type: "growth_delay" }),
          expect.objectContaining({ type: "vision_abnormality" })
        ])
      });
      expect(response.json().ruleEvaluations).toHaveLength(3);
    } finally {
      await app.close();
    }
  });

  it("returns a created checkup by id", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/checkups",
        payload: validRequest
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/checkups/${created.checkup.id}`
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(created.checkup);
    } finally {
      await app.close();
    }
  });

  it("returns 404 with a useful error shape for missing checkups", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const response = await app.inject({
        method: "GET",
        url: "/checkups/checkup_missing"
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

  it("returns 400 instead of 500 for invalid checkup intake requests", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const response = await app.inject({
        method: "POST",
        url: "/checkups",
        payload: {
          ...validRequest,
          metrics: [{ ...validRequest.metrics[0], unit: "kg" }]
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

  it("returns a normalized validation error for malformed JSON", async () => {
    const app = await buildApp(createMemoryStore());

    try {
      const response = await app.inject({
        method: "POST",
        url: "/checkups",
        headers: {
          "content-type": "application/json"
        },
        payload: "{"
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: "validation_error",
        message: expect.any(String)
      });
    } finally {
      await app.close();
    }
  });
});
