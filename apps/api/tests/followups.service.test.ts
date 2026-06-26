import { describe, expect, it } from "vitest";

import type { ParentReportContent } from "@child-health/contracts";

import { createMemoryStore } from "../src/db/client.js";
import { createFollowUpsForCheckup } from "../src/modules/followups/followups.service.js";
import { renderPosterSvg } from "../src/modules/posters/poster.service.js";
import type { RuleEvaluation } from "../src/modules/rules/rules.service.js";

const createdAt = new Date("2026-06-24T08:00:00.000Z");

function ruleEvaluation(input: Partial<RuleEvaluation> = {}): RuleEvaluation {
  return {
    id: "checkup_1:rule:overweight_obesity",
    checkupId: "checkup_1",
    type: "overweight_obesity",
    level: "mild",
    standardVersion: "MVP-local-reference-2026-06",
    evidence: ["年龄6岁"],
    recommendedDepartment: "儿童保健科",
    interventionTags: ["每日运动"],
    defaultFollowUpDays: 30,
    ...input
  };
}

describe("createFollowUpsForCheckup", () => {
  it("creates pending wechat follow-up tasks for abnormal rule evaluations with follow-up days", () => {
    const store = createMemoryStore();
    store.ruleEvaluations.push(ruleEvaluation());

    const tasks = createFollowUpsForCheckup(store, "checkup_1", createdAt);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "followup_checkup_1_rule_overweight_obesity",
      checkupId: "checkup_1",
      ruleEvaluationId: "checkup_1:rule:overweight_obesity",
      reason: expect.stringContaining("儿童保健科"),
      plannedAt: "2026-07-24T08:00:00.000Z",
      channel: "wechat",
      status: "pending",
      createdAt: createdAt.toISOString()
    });
    expect(tasks[0]?.reason).toContain("overweight_obesity");
    expect(store.followUps).toEqual(tasks);
  });

  it("does not create follow-ups for normal, unable, or unscheduled rule evaluations", () => {
    const store = createMemoryStore();
    store.ruleEvaluations.push(
      ruleEvaluation({
        id: "checkup_1:rule:overweight_obesity",
        type: "overweight_obesity",
        level: "normal",
        defaultFollowUpDays: null
      }),
      ruleEvaluation({
        id: "checkup_1:rule:growth_delay",
        type: "growth_delay",
        level: "unable_to_evaluate",
        defaultFollowUpDays: null
      }),
      ruleEvaluation({
        id: "checkup_1:rule:vision_abnormality",
        type: "vision_abnormality",
        level: "moderate",
        defaultFollowUpDays: null
      })
    );

    const tasks = createFollowUpsForCheckup(store, "checkup_1", createdAt);

    expect(tasks).toEqual([]);
    expect(store.followUps).toEqual([]);
    expect(store.auditLogs).toEqual([]);
  });

  it("adds planned dates from each rule default and audits created tasks", () => {
    const store = createMemoryStore();
    store.ruleEvaluations.push(
      ruleEvaluation({
        id: "checkup_1:rule:overweight_obesity",
        type: "overweight_obesity",
        defaultFollowUpDays: 7
      }),
      ruleEvaluation({
        id: "checkup_1:rule:vision_abnormality",
        type: "vision_abnormality",
        recommendedDepartment: "眼科",
        defaultFollowUpDays: 45
      }),
      ruleEvaluation({
        id: "checkup_2:rule:growth_delay",
        checkupId: "checkup_2",
        type: "growth_delay",
        defaultFollowUpDays: 15
      })
    );

    const tasks = createFollowUpsForCheckup(store, "checkup_1", createdAt);

    expect(tasks.map((task) => task.plannedAt)).toEqual(["2026-07-01T08:00:00.000Z", "2026-08-08T08:00:00.000Z"]);
    expect(store.auditLogs).toHaveLength(2);
    expect(store.auditLogs.map((entry) => entry.action)).toEqual(["followup.created", "followup.created"]);
    expect(store.auditLogs.map((entry) => entry.entityId)).toEqual(tasks.map((task) => task.id));
    expect(store.auditLogs[1]).toMatchObject({
      payload: {
        checkupId: "checkup_1",
        ruleEvaluationId: "checkup_1:rule:vision_abnormality",
        level: "mild",
        reason: tasks[1]?.reason,
        status: "pending",
        defaultFollowUpDays: 45,
        plannedAt: "2026-08-08T08:00:00.000Z"
      },
      createdAt: createdAt.toISOString()
    });
  });

  it("reuses existing follow-up tasks without writing duplicate audits", () => {
    const store = createMemoryStore();
    store.ruleEvaluations.push(ruleEvaluation());

    const firstTasks = createFollowUpsForCheckup(store, "checkup_1", createdAt);
    const secondTasks = createFollowUpsForCheckup(store, "checkup_1", createdAt);

    expect(firstTasks).toHaveLength(1);
    expect(secondTasks).toEqual(firstTasks);
    expect(store.followUps).toHaveLength(1);
    expect(store.followUps[0]).toEqual(firstTasks[0]);
    expect(store.auditLogs.filter((entry) => entry.action === "followup.created")).toHaveLength(1);
  });
});

describe("renderPosterSvg", () => {
  it("renders escaped poster content and the medical disclaimer", () => {
    const content: ParentReportContent = {
      summary: "身高<体重 & 视力\"需复查\"",
      indicatorExplanation: "指标说明",
      abnormalMeaning: "异常含义",
      departmentAdvice: "科室建议",
      homeIntervention: "家庭干预",
      followUpAdvice: "复查建议",
      posterTitle: "儿童<健康>&提醒",
      posterBullets: ["少糖 & 多运动", "复查\"视力\"", "身高'记录'"]
    };

    const svg = renderPosterSvg(content);

    expect(svg).toContain("<svg");
    expect(svg).toContain("儿童&lt;健康&gt;&amp;提醒");
    expect(svg).toContain("身高&lt;体重 &amp; 视力&quot;需复查&quot;");
    expect(svg).toContain("少糖 &amp; 多运动");
    expect(svg).toContain("复查&quot;视力&quot;");
    expect(svg).toContain("身高&apos;记录&apos;");
    expect(svg).toContain("本内容为健康科普，不替代医生面诊。");
    expect(svg).not.toContain("儿童<健康>");
    expect(svg).not.toContain("少糖 & 多运动");
  });

  it("strips invalid XML control characters before rendering SVG text", () => {
    const content: ParentReportContent = {
      summary: "身高\u0000体重",
      indicatorExplanation: "指标说明",
      abnormalMeaning: "异常含义",
      departmentAdvice: "科室建议",
      homeIntervention: "家庭干预",
      followUpAdvice: "复查建议",
      posterTitle: "儿童\u0000健康提醒",
      posterBullets: ["少糖\u0000多运动", "复查视力"]
    };

    const svg = renderPosterSvg(content);

    expect(svg).not.toContain("\u0000");
    expect(svg).toContain("儿童健康提醒");
    expect(svg).toContain("身高体重");
    expect(svg).toContain("少糖多运动");
  });
});
