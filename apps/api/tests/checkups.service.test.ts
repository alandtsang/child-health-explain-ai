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
});
