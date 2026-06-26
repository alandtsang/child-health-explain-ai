import { ParentReportContentSchema, type CheckupRecord, type ParentReportContent } from "@child-health/contracts";

import type { RuleEvaluation } from "../rules/rules.service.js";

const LEVEL_LABELS: Record<RuleEvaluation["level"], string> = {
  normal: "正常",
  mild: "轻度",
  moderate: "中度",
  severe: "重度",
  unable_to_evaluate: "暂无法评估"
};

const TYPE_LABELS: Record<RuleEvaluation["type"], string> = {
  overweight_obesity: "体重/BMI",
  growth_delay: "生长发育",
  vision_abnormality: "视力"
};

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function abnormalEvaluations(evaluations: readonly RuleEvaluation[]): RuleEvaluation[] {
  return evaluations.filter((evaluation) => !["normal", "unable_to_evaluate"].includes(evaluation.level));
}

export class LocalAiComposer {
  compose(checkup: CheckupRecord, evaluations: readonly RuleEvaluation[]): ParentReportContent {
    const abnormal = abnormalEvaluations(evaluations);

    if (abnormal.length === 0) {
      return ParentReportContentSchema.parse({
        summary: `${checkup.childName}本次体检未发现需要重点干预的异常结果。`,
        indicatorExplanation: "已结合本次确认指标完成本地规则评估，当前结果以日常健康维护为主。",
        abnormalMeaning: "未见明显异常不代表以后不会变化，建议继续关注身高、体重、视力等趋势。",
        departmentAdvice: "暂不需要因本次结果新增专科就诊，如有不适可咨询儿童保健科。",
        homeIntervention: "保持均衡饮食、规律睡眠、每日户外活动，并减少长时间近距离用眼。",
        followUpAdvice: "按学校或社区体检节奏复查，若家长观察到明显变化可提前复诊。",
        posterTitle: "健康维护提醒",
        posterBullets: ["均衡饮食和规律作息", "每日户外活动", "定期复查生长和视力"]
      });
    }

    const departments = unique(abnormal.map((evaluation) => evaluation.recommendedDepartment));
    const tags = unique(abnormal.flatMap((evaluation) => evaluation.interventionTags));
    const shortestFollowUpDays = abnormal
      .map((evaluation) => evaluation.defaultFollowUpDays)
      .filter((days): days is number => days !== null)
      .sort((left, right) => left - right)[0];
    const abnormalSummary = abnormal
      .map((evaluation) => `${TYPE_LABELS[evaluation.type]}${LEVEL_LABELS[evaluation.level]}`)
      .join("、");

    return ParentReportContentSchema.parse({
      summary: `${checkup.childName}本次体检提示：${abnormalSummary}，建议由医生结合孩子情况复核。`,
      indicatorExplanation: abnormal
        .map((evaluation) => `${TYPE_LABELS[evaluation.type]}依据：${evaluation.evidence.join("，")}`)
        .join("；"),
      abnormalMeaning: "这些结果提示需要关注相关健康风险，但不能替代医生面诊诊断。",
      departmentAdvice: `建议优先咨询${departments.join("、")}，由医生确认是否需要进一步检查或转诊。`,
      homeIntervention: tags.length > 0 ? `家庭可先配合：${tags.join("、")}。` : "家庭先保持规律作息并记录变化。",
      followUpAdvice:
        shortestFollowUpDays === undefined
          ? "请按医生建议安排复查。"
          : `建议约${shortestFollowUpDays}天后复查，若症状变化或医生另有安排，以医生意见为准。`,
      posterTitle: "重点复查提醒",
      posterBullets: unique([...departments.map((department) => `咨询${department}`), ...tags]).slice(0, 4)
    });
  }
}
