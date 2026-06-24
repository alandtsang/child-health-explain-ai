import { describe, expect, it } from "vitest";

import { CreateCheckupRequestSchema } from "../src/checkup.schema.js";

const baseRequest = {
  childName: "Mina",
  childSex: "female",
  childBirthDate: "2020-02-29",
  source: "doctor_manual",
  metrics: [
    {
      key: "heightCm",
      value: 110,
      unit: "cm",
      confirmedBy: "doctor",
      confirmedAt: "2026-06-24T08:00:00.000Z"
    }
  ]
} as const;

describe("CreateCheckupRequestSchema", () => {
  it("rejects mismatched metric key and unit", () => {
    const result = CreateCheckupRequestSchema.safeParse({
      ...baseRequest,
      metrics: [{ ...baseRequest.metrics[0], unit: "kg" }]
    });

    expect(result.success).toBe(false);
  });

  it("rejects metric values outside the allowed range", () => {
    const result = CreateCheckupRequestSchema.safeParse({
      ...baseRequest,
      metrics: [{ ...baseRequest.metrics[0], value: -1 }]
    });

    expect(result.success).toBe(false);
  });

  it("rejects impossible birth dates", () => {
    const result = CreateCheckupRequestSchema.safeParse({
      ...baseRequest,
      childBirthDate: "2025-02-29"
    });

    expect(result.success).toBe(false);
  });

  it("parses a valid request", () => {
    const result = CreateCheckupRequestSchema.safeParse(baseRequest);

    expect(result.success).toBe(true);
  });
});
