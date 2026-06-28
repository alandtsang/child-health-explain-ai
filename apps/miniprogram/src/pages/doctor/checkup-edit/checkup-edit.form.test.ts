import { describe, expect, it } from "vitest";

import { buildCheckupDraftRequest } from "./checkup-edit.form";

const now = "2026-06-24T08:00:00.000Z";

describe("checkup draft form", () => {
  it("rejects blank metric inputs before submitting to the API", () => {
    const result = buildCheckupDraftRequest(
      {
        childName: "小明",
        childBirthDate: "2020-06-24",
        heightCm: "",
        weightKg: "22",
        leftVision: "0.8",
        rightVision: "0.9",
        sexIndex: 0
      },
      now
    );

    expect(result).toEqual({
      ok: false,
      message: "请输入身高"
    });
  });

  it("builds a valid doctor manual checkup request from filled inputs", () => {
    const result = buildCheckupDraftRequest(
      {
        childName: "小明",
        childBirthDate: "2020-06-24",
        heightCm: "110.5",
        weightKg: "22",
        leftVision: "0.8",
        rightVision: "0.9",
        sexIndex: 0
      },
      now
    );

    expect(result).toMatchObject({
      ok: true,
      body: {
        childName: "小明",
        childSex: "male",
        childBirthDate: "2020-06-24",
        source: "doctor_manual",
        metrics: [
          { key: "heightCm", value: 110.5, unit: "cm", confirmedBy: "doctor", confirmedAt: now },
          { key: "weightKg", value: 22, unit: "kg", confirmedBy: "doctor", confirmedAt: now },
          { key: "leftVision", value: 0.8, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: now },
          { key: "rightVision", value: 0.9, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: now }
        ]
      }
    });
  });

  it("rejects metric values outside API accepted ranges before submitting", () => {
    const result = buildCheckupDraftRequest(
      {
        childName: "小明",
        childBirthDate: "2020-06-24",
        heightCm: "20",
        weightKg: "22",
        leftVision: "0.8",
        rightVision: "0.9",
        sexIndex: 0
      },
      now
    );

    expect(result).toEqual({
      ok: false,
      message: "身高需在 30-220 之间"
    });
  });

  it("normalizes common dash characters in birth dates before submitting", () => {
    const result = buildCheckupDraftRequest(
      {
        childName: "张三",
        childBirthDate: "2020–06–24",
        heightCm: "100",
        weightKg: "14",
        leftVision: "1",
        rightVision: "1",
        sexIndex: 0
      },
      now
    );

    expect(result).toMatchObject({
      ok: true,
      body: {
        childBirthDate: "2020-06-24"
      }
    });
  });
});
