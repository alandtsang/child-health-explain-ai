import {
  CHILD_GROWTH_STANDARD_VERSION,
  ageInYears,
  evaluateBmiLevel,
  evaluateHeightLevel
} from "./child-growth.rules.js";
import { VISION_STANDARD_VERSION, evaluateVisionLevel } from "./vision.rules.js";

type ConfirmedMetric =
  | { key: "heightCm"; value: number; unit: "cm" }
  | { key: "weightKg"; value: number; unit: "kg" }
  | { key: "leftVision"; value: number; unit: "decimal_vision" }
  | { key: "rightVision"; value: number; unit: "decimal_vision" };

type CheckupForRules = {
  id: string;
  childSex: "male" | "female";
  childBirthDate: string;
  metrics: readonly ConfirmedMetric[];
};

export type RuleEvaluation = {
  id: string;
  checkupId: string;
  type: "overweight_obesity" | "growth_delay" | "vision_abnormality";
  level: "normal" | "mild" | "moderate" | "severe" | "unable_to_evaluate";
  standardVersion: string;
  evidence: string[];
  recommendedDepartment: string;
  interventionTags: string[];
  defaultFollowUpDays: number | null;
};

function metricValue(metrics: readonly ConfirmedMetric[], key: ConfirmedMetric["key"]): number | undefined {
  return metrics.find((metric) => metric.key === key)?.value;
}

function ruleId(checkupId: string, type: RuleEvaluation["type"]): string {
  return `${checkupId}:rule:${type}`;
}

function unable(checkupId: string, type: RuleEvaluation["type"], department: string): RuleEvaluation {
  return {
    id: ruleId(checkupId, type),
    checkupId,
    type,
    level: "unable_to_evaluate",
    standardVersion: "MVP-local-reference-2026-06",
    evidence: ["缺少必要指标，无法完成规则判断"],
    recommendedDepartment: department,
    interventionTags: [],
    defaultFollowUpDays: null
  };
}

export function evaluateCheckupRules(checkup: CheckupForRules, at: Date = new Date()): RuleEvaluation[] {
  const heightCm = metricValue(checkup.metrics, "heightCm");
  const weightKg = metricValue(checkup.metrics, "weightKg");
  const leftVision = metricValue(checkup.metrics, "leftVision");
  const rightVision = metricValue(checkup.metrics, "rightVision");
  const ageYears = ageInYears(checkup.childBirthDate, at);
  const results: RuleEvaluation[] = [];

  if (heightCm === undefined || weightKg === undefined) {
    results.push(unable(checkup.id, "overweight_obesity", "儿童保健科"));
  } else {
    const level = evaluateBmiLevel(checkup.childSex, ageYears, heightCm, weightKg);
    results.push({
      id: ruleId(checkup.id, "overweight_obesity"),
      checkupId: checkup.id,
      type: "overweight_obesity",
      level,
      standardVersion: CHILD_GROWTH_STANDARD_VERSION,
      evidence: [`年龄${ageYears}岁`, `身高${heightCm}cm`, `体重${weightKg}kg`],
      recommendedDepartment: "儿童保健科",
      interventionTags: level === "normal" ? [] : ["饮食结构调整", "每日运动", "减少含糖饮料"],
      defaultFollowUpDays: level === "normal" ? null : 30
    });
  }

  if (heightCm === undefined) {
    results.push(unable(checkup.id, "growth_delay", "儿童保健科"));
  } else {
    const level = evaluateHeightLevel(checkup.childSex, ageYears, heightCm);
    results.push({
      id: ruleId(checkup.id, "growth_delay"),
      checkupId: checkup.id,
      type: "growth_delay",
      level,
      standardVersion: CHILD_GROWTH_STANDARD_VERSION,
      evidence: [`年龄${ageYears}岁`, `身高${heightCm}cm`],
      recommendedDepartment: "儿童保健科",
      interventionTags: level === "normal" ? [] : ["睡眠评估", "营养评估", "生长曲线复查"],
      defaultFollowUpDays: level === "normal" ? null : 30
    });
  }

  if (leftVision === undefined || rightVision === undefined) {
    results.push(unable(checkup.id, "vision_abnormality", "眼科"));
  } else {
    const level = evaluateVisionLevel(ageYears, leftVision, rightVision);
    results.push({
      id: ruleId(checkup.id, "vision_abnormality"),
      checkupId: checkup.id,
      type: "vision_abnormality",
      level,
      standardVersion: VISION_STANDARD_VERSION,
      evidence: [`年龄${ageYears}岁`, `左眼视力${leftVision}`, `右眼视力${rightVision}`],
      recommendedDepartment: "眼科",
      interventionTags: level === "normal" ? [] : ["减少近距离用眼", "增加户外活动", "验光复查"],
      defaultFollowUpDays: level === "normal" ? null : 30
    });
  }

  return results;
}
