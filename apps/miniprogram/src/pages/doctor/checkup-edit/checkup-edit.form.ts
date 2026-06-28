import type { ConfirmedMetric, CreateCheckupRequest } from "../../../api/types";

export type SexOption = {
  label: string;
  value: "male" | "female";
};

export const sexOptions: SexOption[] = [
  { label: "男孩", value: "male" },
  { label: "女孩", value: "female" }
];

export type CheckupDraftForm = {
  childName: string;
  childBirthDate: string;
  heightCm: string;
  weightKg: string;
  leftVision: string;
  rightVision: string;
  sexIndex: number;
};

type CheckupDraftRequestResult =
  | { ok: true; body: CreateCheckupRequest }
  | { ok: false; message: string };

type NumericField = {
  key: ConfirmedMetric["key"];
  value: string;
  label: string;
  unit: ConfirmedMetric["unit"];
  min: number;
  max: number;
};

function parseRequiredNumber(value: string, label: string): number | string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) return `请输入${label}`;

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) return `${label}必须是数字`;

  return parsedValue;
}

function normalizeDateOnly(value: string): string {
  return value.trim().replace(/[‐‑‒–—―－]/g, "-");
}

function buildMetric(
  key: ConfirmedMetric["key"],
  value: number,
  unit: ConfirmedMetric["unit"],
  confirmedAt: string
): ConfirmedMetric {
  return {
    key,
    value,
    unit,
    confirmedBy: "doctor",
    confirmedAt
  };
}

export function buildCheckupDraftRequest(form: CheckupDraftForm, confirmedAt: string): CheckupDraftRequestResult {
  const childName = form.childName.trim();
  const childBirthDate = normalizeDateOnly(form.childBirthDate);
  const sexOption = sexOptions[form.sexIndex];

  if (childName.length === 0) return { ok: false, message: "请输入儿童姓名" };
  if (childBirthDate.length === 0) return { ok: false, message: "请输入出生日期" };
  if (!sexOption) return { ok: false, message: "请选择性别" };

  const numericFields: NumericField[] = [
    { key: "heightCm", value: form.heightCm, label: "身高", unit: "cm", min: 30, max: 220 },
    { key: "weightKg", value: form.weightKg, label: "体重", unit: "kg", min: 1, max: 200 },
    { key: "leftVision", value: form.leftVision, label: "左眼视力", unit: "decimal_vision", min: 0, max: 2 },
    { key: "rightVision", value: form.rightVision, label: "右眼视力", unit: "decimal_vision", min: 0, max: 2 }
  ];
  const metrics: ConfirmedMetric[] = [];

  for (const field of numericFields) {
    const value = parseRequiredNumber(field.value, field.label);

    if (typeof value === "string") {
      return { ok: false, message: value };
    }

    if (value < field.min || value > field.max) {
      return { ok: false, message: `${field.label}需在 ${field.min}-${field.max} 之间` };
    }

    metrics.push(buildMetric(field.key, value, field.unit, confirmedAt));
  }

  return {
    ok: true,
    body: {
      childName,
      childSex: sexOption.value,
      childBirthDate,
      source: "doctor_manual",
      metrics
    }
  };
}
