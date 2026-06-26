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

type TestMetric = (typeof baseCheckup.metrics)[number];

const evaluationDate = new Date("2026-06-24T08:00:00.000Z");

function byType(results: ReturnType<typeof evaluateCheckupRules>, type: (typeof results)[number]["type"]) {
  const result = results.find((item) => item.type === type);
  if (!result) throw new Error(`Missing rule evaluation: ${type}`);

  return result;
}

function withMetricValue(key: TestMetric["key"], value: number) {
  return {
    ...baseCheckup,
    metrics: baseCheckup.metrics.map((metric) => (metric.key === key ? { ...metric, value } : metric))
  };
}

function expectUnable(result: ReturnType<typeof evaluateCheckupRules>[number]) {
  expect(result.level).toBe("unable_to_evaluate");
  expect(result.interventionTags).toEqual([]);
  expect(result.defaultFollowUpDays).toBeNull();
}

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
    expect(results.map((item) => item.id)).toEqual([
      "checkup_1:rule:overweight_obesity",
      "checkup_1:rule:growth_delay",
      "checkup_1:rule:vision_abnormality"
    ]);
  });

  it("flags overweight or obesity from BMI for a 6-year-old child", () => {
    const results = evaluateCheckupRules(baseCheckup, evaluationDate);
    const growth = byType(results, "overweight_obesity");

    expect(growth.level).toBe("moderate");
    expect(growth.recommendedDepartment).toBe("儿童保健科");
    expect(growth.defaultFollowUpDays).toBe(30);
    expect(growth.evidence).toContain("年龄6岁");
  });

  it("uses the previous calendar age on the day before a birthday", () => {
    const results = evaluateCheckupRules(baseCheckup, new Date("2026-06-23T08:00:00.000Z"));

    expect(byType(results, "overweight_obesity").evidence).toContain("年龄5岁");
  });

  it("flags growth delay from low height for the age-6 band", () => {
    const results = evaluateCheckupRules(withMetricValue("heightCm", 102), evaluationDate);
    const result = byType(results, "growth_delay");

    expect(result.level).toBe("moderate");
    expect(result.recommendedDepartment).toBe("儿童保健科");
    expect(result.defaultFollowUpDays).toBe(30);
  });

  it("flags vision abnormality when either eye is below age threshold", () => {
    const results = evaluateCheckupRules(baseCheckup, evaluationDate);
    const result = byType(results, "vision_abnormality");

    expect(result.level).toBe("moderate");
    expect(result.recommendedDepartment).toBe("眼科");
    expect(result.defaultFollowUpDays).toBe(30);
  });

  it("marks every rule unable_to_evaluate when required metrics are missing", () => {
    const results = evaluateCheckupRules({ ...baseCheckup, metrics: [] }, evaluationDate);

    expect(results).toHaveLength(3);
    expect(results.every((item) => item.level === "unable_to_evaluate")).toBe(true);
  });

  it("marks every rule unable_to_evaluate for invalid, future, or unsupported birth dates", () => {
    const invalidBirthDateResults = evaluateCheckupRules({ ...baseCheckup, childBirthDate: "2020-02-31" }, evaluationDate);
    const futureBirthDateResults = evaluateCheckupRules({ ...baseCheckup, childBirthDate: "2030-06-24" }, evaluationDate);
    const unsupportedAgeResults = evaluateCheckupRules({ ...baseCheckup, childBirthDate: "2010-06-24" }, evaluationDate);

    expect(invalidBirthDateResults).toHaveLength(3);
    invalidBirthDateResults.forEach(expectUnable);
    expect(futureBirthDateResults).toHaveLength(3);
    futureBirthDateResults.forEach(expectUnable);
    expect(unsupportedAgeResults).toHaveLength(3);
    unsupportedAgeResults.forEach(expectUnable);
  });

  it("marks rules unable_to_evaluate when dependent numeric metrics are invalid", () => {
    const zeroHeightResults = evaluateCheckupRules(withMetricValue("heightCm", 0), evaluationDate);
    const nonFiniteWeightResults = evaluateCheckupRules(withMetricValue("weightKg", Number.NaN), evaluationDate);
    const outOfRangeVisionResults = evaluateCheckupRules(withMetricValue("leftVision", 2.1), evaluationDate);

    expectUnable(byType(zeroHeightResults, "overweight_obesity"));
    expectUnable(byType(zeroHeightResults, "growth_delay"));
    expect(byType(zeroHeightResults, "vision_abnormality").level).toBe("moderate");
    expectUnable(byType(nonFiniteWeightResults, "overweight_obesity"));
    expect(byType(nonFiniteWeightResults, "growth_delay").level).toBe("moderate");
    expectUnable(byType(outOfRangeVisionResults, "vision_abnormality"));
    expect(byType(outOfRangeVisionResults, "overweight_obesity").level).toBe("moderate");
  });

  it("marks rules unable_to_evaluate when dependent metric keys are duplicated", () => {
    const duplicateHeightResults = evaluateCheckupRules(
      { ...baseCheckup, metrics: [...baseCheckup.metrics, { ...baseCheckup.metrics[0], value: 106 }] },
      evaluationDate
    );
    const duplicateVisionResults = evaluateCheckupRules(
      { ...baseCheckup, metrics: [...baseCheckup.metrics, { ...baseCheckup.metrics[2], value: 0.8 }] },
      evaluationDate
    );

    expectUnable(byType(duplicateHeightResults, "overweight_obesity"));
    expectUnable(byType(duplicateHeightResults, "growth_delay"));
    expect(byType(duplicateHeightResults, "overweight_obesity").evidence.join("")).toContain("重复");
    expect(byType(duplicateHeightResults, "vision_abnormality").level).toBe("moderate");
    expectUnable(byType(duplicateVisionResults, "vision_abnormality"));
    expect(byType(duplicateVisionResults, "vision_abnormality").evidence.join("")).toContain("重复");
  });
});
