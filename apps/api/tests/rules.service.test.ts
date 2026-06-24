import { describe, expect, it } from "vitest";

import { evaluateCheckupRules } from "../src/modules/rules/rules.service.js";

const baseCheckup = {
  id: "checkup_1",
  childId: "child_1",
  childName: "小明",
  childSex: "male",
  childBirthDate: "2020-06-24",
  source: "doctor_manual",
  createdAt: "2026-06-24T08:00:00.000Z",
  ocrFields: [],
  metrics: [
    {
      key: "heightCm",
      value: 105,
      unit: "cm",
      confirmedBy: "doctor",
      confirmedAt: "2026-06-24T08:00:00.000Z"
    },
    {
      key: "weightKg",
      value: 24,
      unit: "kg",
      confirmedBy: "doctor",
      confirmedAt: "2026-06-24T08:00:00.000Z"
    },
    {
      key: "leftVision",
      value: 0.6,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt: "2026-06-24T08:00:00.000Z"
    },
    {
      key: "rightVision",
      value: 0.7,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt: "2026-06-24T08:00:00.000Z"
    }
  ]
} as const;

const evaluationDate = new Date("2026-06-24T08:00:00.000Z");

describe("evaluateCheckupRules", () => {
  it("returns one deterministic evaluation for each supported abnormality", () => {
    const results = evaluateCheckupRules(baseCheckup, evaluationDate);
    const repeatedResults = evaluateCheckupRules(baseCheckup, evaluationDate);

    expect(results).toHaveLength(3);
    expect(results.map((item) => item.type)).toEqual([
      "overweight_obesity",
      "growth_delay",
      "vision_abnormality"
    ]);
    expect(repeatedResults).toEqual(results);
  });

  it("flags overweight or obesity from BMI for a 6-year-old child", () => {
    const results = evaluateCheckupRules(baseCheckup, evaluationDate);
    const growth = results.find((item) => item.type === "overweight_obesity");

    expect(growth?.level).toBe("moderate");
    expect(growth?.recommendedDepartment).toBe("儿童保健科");
    expect(growth?.defaultFollowUpDays).toBe(30);
  });

  it("flags growth delay from very low height", () => {
    const results = evaluateCheckupRules(
      {
        ...baseCheckup,
        metrics: baseCheckup.metrics.map((metric) =>
          metric.key === "heightCm" ? { ...metric, value: 95 } : metric
        )
      },
      evaluationDate
    );
    const result = results.find((item) => item.type === "growth_delay");

    expect(result?.level).toBe("moderate");
    expect(result?.recommendedDepartment).toBe("儿童保健科");
    expect(result?.defaultFollowUpDays).toBe(30);
  });

  it("flags vision abnormality when either eye is below age threshold", () => {
    const results = evaluateCheckupRules(baseCheckup, evaluationDate);
    const result = results.find((item) => item.type === "vision_abnormality");

    expect(result?.level).toBe("moderate");
    expect(result?.recommendedDepartment).toBe("眼科");
    expect(result?.defaultFollowUpDays).toBe(30);
  });

  it("marks every rule unable_to_evaluate when required metrics are missing", () => {
    const results = evaluateCheckupRules({ ...baseCheckup, metrics: [] }, evaluationDate);

    expect(results).toHaveLength(3);
    expect(results.every((item) => item.level === "unable_to_evaluate")).toBe(true);
  });
});
