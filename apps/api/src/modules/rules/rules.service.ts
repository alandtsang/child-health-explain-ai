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

type MetricValue = { value: number };
type MetricIssue = { evidence: string };
type MetricResolution = MetricValue | MetricIssue;

const SUPPORTED_MIN_AGE_YEARS = 2;
const SUPPORTED_MAX_AGE_YEARS = 12;

function metricValue(metrics: readonly ConfirmedMetric[], key: ConfirmedMetric["key"]): MetricResolution {
  const matches = metrics.filter((metric) => metric.key === key);
  if (matches.length === 0) return { evidence: `缺少${key}指标，无法完成规则判断` };
  if (matches.length > 1) return { evidence: `${key}指标重复或冲突，无法完成规则判断` };

  return { value: matches[0].value };
}

function hasMetricValue(metric: MetricResolution): metric is MetricValue {
  return "value" in metric;
}

function ruleId(checkupId: string, type: RuleEvaluation["type"]): string {
  return `${checkupId}:rule:${type}`;
}

function unable(
  checkupId: string,
  type: RuleEvaluation["type"],
  department: string,
  evidence = "缺少必要指标，无法完成规则判断"
): RuleEvaluation {
  return {
    id: ruleId(checkupId, type),
    checkupId,
    type,
    level: "unable_to_evaluate",
    standardVersion: "MVP-local-reference-2026-06",
    evidence: [evidence],
    recommendedDepartment: department,
    interventionTags: [],
    defaultFollowUpDays: null
  };
}

function isSupportedAge(ageYears: number | undefined): ageYears is number {
  return (
    ageYears !== undefined &&
    Number.isInteger(ageYears) &&
    ageYears >= SUPPORTED_MIN_AGE_YEARS &&
    ageYears <= SUPPORTED_MAX_AGE_YEARS
  );
}

function invalidMetricEvidence(key: ConfirmedMetric["key"]): string {
  return `${key}指标数值无效，无法完成规则判断`;
}

function metricIssue(...metrics: MetricResolution[]): string | undefined {
  return metrics.find((metric): metric is MetricIssue => "evidence" in metric)?.evidence;
}

function validHeight(heightCm: number): boolean {
  return Number.isFinite(heightCm) && heightCm > 0;
}

function validWeight(weightKg: number): boolean {
  return Number.isFinite(weightKg) && weightKg > 0;
}

function validVision(vision: number): boolean {
  return Number.isFinite(vision) && vision >= 0 && vision <= 2;
}

function interventionTags(level: RuleEvaluation["level"], tags: string[]): string[] {
  return level === "normal" || level === "unable_to_evaluate" ? [] : tags;
}

function followUpDays(level: RuleEvaluation["level"]): number | null {
  return level === "normal" || level === "unable_to_evaluate" ? null : 30;
}

export function evaluateCheckupRules(checkup: CheckupForRules, at: Date = new Date()): RuleEvaluation[] {
  const heightCm = metricValue(checkup.metrics, "heightCm");
  const weightKg = metricValue(checkup.metrics, "weightKg");
  const leftVision = metricValue(checkup.metrics, "leftVision");
  const rightVision = metricValue(checkup.metrics, "rightVision");
  const ageYears = ageInYears(checkup.childBirthDate, at);
  const results: RuleEvaluation[] = [];

  if (!isSupportedAge(ageYears)) {
    return [
      unable(checkup.id, "overweight_obesity", "儿童保健科", "出生日期无效或年龄不在支持范围，无法完成规则判断"),
      unable(checkup.id, "growth_delay", "儿童保健科", "出生日期无效或年龄不在支持范围，无法完成规则判断"),
      unable(checkup.id, "vision_abnormality", "眼科", "出生日期无效或年龄不在支持范围，无法完成规则判断")
    ];
  }

  const bmiMetricIssue = metricIssue(heightCm, weightKg);
  if (bmiMetricIssue) {
    results.push(unable(checkup.id, "overweight_obesity", "儿童保健科", bmiMetricIssue));
  } else if (!hasMetricValue(heightCm) || !hasMetricValue(weightKg)) {
    results.push(unable(checkup.id, "overweight_obesity", "儿童保健科"));
  } else if (!validHeight(heightCm.value)) {
    results.push(unable(checkup.id, "overweight_obesity", "儿童保健科", invalidMetricEvidence("heightCm")));
  } else if (!validWeight(weightKg.value)) {
    results.push(unable(checkup.id, "overweight_obesity", "儿童保健科", invalidMetricEvidence("weightKg")));
  } else {
    const level = evaluateBmiLevel(checkup.childSex, ageYears, heightCm.value, weightKg.value);
    results.push({
      id: ruleId(checkup.id, "overweight_obesity"),
      checkupId: checkup.id,
      type: "overweight_obesity",
      level,
      standardVersion: CHILD_GROWTH_STANDARD_VERSION,
      evidence: [`年龄${ageYears}岁`, `身高${heightCm.value}cm`, `体重${weightKg.value}kg`],
      recommendedDepartment: "儿童保健科",
      interventionTags: interventionTags(level, ["饮食结构调整", "每日运动", "减少含糖饮料"]),
      defaultFollowUpDays: followUpDays(level)
    });
  }

  const heightMetricIssue = metricIssue(heightCm);
  if (heightMetricIssue) {
    results.push(unable(checkup.id, "growth_delay", "儿童保健科", heightMetricIssue));
  } else if (!hasMetricValue(heightCm)) {
    results.push(unable(checkup.id, "growth_delay", "儿童保健科"));
  } else if (!validHeight(heightCm.value)) {
    results.push(unable(checkup.id, "growth_delay", "儿童保健科", invalidMetricEvidence("heightCm")));
  } else {
    const level = evaluateHeightLevel(checkup.childSex, ageYears, heightCm.value);
    results.push({
      id: ruleId(checkup.id, "growth_delay"),
      checkupId: checkup.id,
      type: "growth_delay",
      level,
      standardVersion: CHILD_GROWTH_STANDARD_VERSION,
      evidence: [`年龄${ageYears}岁`, `身高${heightCm.value}cm`],
      recommendedDepartment: "儿童保健科",
      interventionTags: interventionTags(level, ["睡眠评估", "营养评估", "生长曲线复查"]),
      defaultFollowUpDays: followUpDays(level)
    });
  }

  const visionMetricIssue = metricIssue(leftVision, rightVision);
  if (visionMetricIssue) {
    results.push(unable(checkup.id, "vision_abnormality", "眼科", visionMetricIssue));
  } else if (!hasMetricValue(leftVision) || !hasMetricValue(rightVision)) {
    results.push(unable(checkup.id, "vision_abnormality", "眼科"));
  } else if (!validVision(leftVision.value)) {
    results.push(unable(checkup.id, "vision_abnormality", "眼科", invalidMetricEvidence("leftVision")));
  } else if (!validVision(rightVision.value)) {
    results.push(unable(checkup.id, "vision_abnormality", "眼科", invalidMetricEvidence("rightVision")));
  } else {
    const level = evaluateVisionLevel(ageYears, leftVision.value, rightVision.value);
    results.push({
      id: ruleId(checkup.id, "vision_abnormality"),
      checkupId: checkup.id,
      type: "vision_abnormality",
      level,
      standardVersion: VISION_STANDARD_VERSION,
      evidence: [`年龄${ageYears}岁`, `左眼视力${leftVision.value}`, `右眼视力${rightVision.value}`],
      recommendedDepartment: "眼科",
      interventionTags: interventionTags(level, ["减少近距离用眼", "增加户外活动", "验光复查"]),
      defaultFollowUpDays: followUpDays(level)
    });
  }

  return results;
}
