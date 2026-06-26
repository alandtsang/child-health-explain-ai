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

function unableEvaluations(evaluations: readonly RuleEvaluation[]): RuleEvaluation[] {
  return evaluations.filter((evaluation) => evaluation.level === "unable_to_evaluate");
}

function evidenceLine(evaluation: RuleEvaluation): string {
  return `${TYPE_LABELS[evaluation.type]}${LEVEL_LABELS[evaluation.level]}依据：${evaluation.evidence.join("，")}`;
}

export class LocalAiComposer {
  compose(checkup: CheckupRecord, evaluations: readonly RuleEvaluation[]): ParentReportContent {
    const abnormal = abnormalEvaluations(evaluations);
    const unable = unableEvaluations(evaluations);

    if (abnormal.length === 0 && unable.length === 0) {
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

    if (abnormal.length === 0) {
      const departments = unique(unable.map((evaluation) => evaluation.recommendedDepartment));
      const unableSummary = unable.map((evaluation) => `${TYPE_LABELS[evaluation.type]}暂无法评估`).join("、");

      return ParentReportContentSchema.parse({
        summary: `${checkup.childName}本次体检中${unableSummary}，本报告只能提供有限提示，不能据此判断为正常。`,
        indicatorExplanation: unable.map(evidenceLine).join("；"),
        abnormalMeaning: "暂无法评估表示现有数据缺失、无效或超出本地规则支持范围，需要补齐或复核后再判断风险。",
        departmentAdvice: `建议携带原始体检记录咨询${departments.join("、")}，由医生核对数据并决定是否补测或转诊。`,
        homeIntervention: "在完成复核前，家庭先记录身高、体重、视力等原始数据，避免自行解读为无异常。",
        followUpAdvice: "请尽快补齐或更正确认指标后复评；若孩子已有不适或家长担心，请提前就医。",
        posterTitle: "资料复核提醒",
        posterBullets: unique([...departments.map((department) => `咨询${department}`), "补齐体检指标", "复核原始记录"]).slice(
          0,
          4
        )
      });
    }

    const departments = unique([...abnormal, ...unable].map((evaluation) => evaluation.recommendedDepartment));
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
      indicatorExplanation: [...abnormal.map(evidenceLine), ...unable.map(evidenceLine)].join("；"),
      abnormalMeaning:
        unable.length > 0
          ? "已评估出的结果提示需要关注相关健康风险；暂无法评估的项目需补齐或复核数据后再判断。"
          : "这些结果提示需要关注相关健康风险，但不能替代医生面诊诊断。",
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
