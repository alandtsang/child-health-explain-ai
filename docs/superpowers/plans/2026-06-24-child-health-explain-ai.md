# Child Health Explain AI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable MVP for a WeChat mini program plus self-hosted backend that handles child checkup intake, OCR confirmation, deterministic abnormality evaluation, AI-style parent explanations, poster generation, doctor review, and follow-up reminders.

**Architecture:** Use a TypeScript monorepo so mini program types, backend contracts, rule outputs, and tests stay aligned. The backend owns medical rules, AI composition, audit logs, report state, poster payloads, and follow-up scheduling; the mini program consumes typed API DTOs through a small client. OCR, AI model calls, WeChat messages, and SMS are adapter interfaces with local deterministic implementations for the first runnable MVP.

**Tech Stack:** pnpm workspaces, TypeScript, Fastify, Zod, in-memory local MVP persistence, Vitest, WeChat native mini program pages in TypeScript/WXML/WXSS, SVG-based poster generation.

---

## File Structure

Create this structure:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
.env.example
apps/
  api/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      app.ts
      server.ts
      config.ts
      db/client.ts
      modules/audit/audit.service.ts
      modules/checkups/checkups.routes.ts
      modules/checkups/checkups.service.ts
      modules/followups/followups.service.ts
      modules/ocr/ocr.adapter.ts
      modules/posters/poster.service.ts
      modules/reports/ai-composer.adapter.ts
      modules/reports/reports.routes.ts
      modules/reports/reports.service.ts
      modules/rules/child-growth.rules.ts
      modules/rules/rules.service.ts
      modules/rules/vision.rules.ts
    tests/
      rules.service.test.ts
      checkups.service.test.ts
      reports.service.test.ts
      followups.service.test.ts
  miniprogram/
    app.json
    app.ts
    app.wxss
    project.config.json
    sitemap.json
    miniprogram_npm/
    src/
      api/client.ts
      api/types.ts
      pages/doctor/checkup-edit/checkup-edit.ts
      pages/doctor/checkup-edit/checkup-edit.wxml
      pages/doctor/checkup-edit/checkup-edit.wxss
      pages/doctor/review/review.ts
      pages/doctor/review/review.wxml
      pages/doctor/review/review.wxss
      pages/parent/self-check/self-check.ts
      pages/parent/self-check/self-check.wxml
      pages/parent/self-check/self-check.wxss
      pages/parent/report/report.ts
      pages/parent/report/report.wxml
      pages/parent/report/report.wxss
packages/
  contracts/
    package.json
    tsconfig.json
    src/index.ts
    src/checkup.schema.ts
    src/report.schema.ts
    src/followup.schema.ts
    src/errors.ts
```

Boundaries:

- `packages/contracts` defines Zod schemas, inferred TypeScript types, enums, and shared error codes.
- `apps/api/src/modules/rules` is the only source of abnormality levels. AI code consumes rule outputs and cannot override them.
- `apps/api/src/modules/reports` composes parent-facing report content from confirmed data and rule results.
- `apps/api/src/modules/posters` renders template-based SVG posters from approved report content.
- `apps/api/src/modules/followups` creates and updates follow-up tasks from rule outputs.
- `apps/miniprogram/src/pages` contains only page state, form validation, and API calls; it does not contain medical rules.

---

### Task 1: Create Monorepo Tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.env.example`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`

- [ ] **Step 1: Add workspace package manifest**

Create `package.json`:

```json
{
  "name": "child-health-explain-ai",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev:api": "pnpm --filter @child-health/api dev"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3",
    "vitest": "^1.6.0"
  },
  "packageManager": "pnpm@9.4.0"
}
```

- [ ] **Step 2: Add workspace configuration**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Add shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@child-health/contracts": ["packages/contracts/src/index.ts"]
    }
  }
}
```

- [ ] **Step 4: Add environment example**

Create `.env.example`:

```bash
DATABASE_URL="file:./dev.db"
API_PORT=8787
AI_PROVIDER="local"
OCR_PROVIDER="local"
WECHAT_MESSAGE_PROVIDER="local"
SMS_PROVIDER="local"
```

- [ ] **Step 5: Add contracts package shell**

Create `packages/contracts/package.json`:

```json
{
  "name": "@child-health/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.3",
    "vitest": "^1.6.0"
  }
}
```

Create `packages/contracts/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/contracts/src/index.ts`:

```ts
export {};
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`

Expected: lockfile created and dependencies installed without errors.

- [ ] **Step 7: Verify empty workspace**

Run: `pnpm typecheck`

Expected: `@child-health/contracts typecheck` passes.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .env.example packages/contracts
git commit -m "chore: set up TypeScript monorepo"
```

---

### Task 2: Define Shared Contracts

**Files:**
- Create: `packages/contracts/src/checkup.schema.ts`
- Create: `packages/contracts/src/report.schema.ts`
- Create: `packages/contracts/src/followup.schema.ts`
- Create: `packages/contracts/src/errors.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write checkup schemas**

Create `packages/contracts/src/checkup.schema.ts`:

```ts
import { z } from "zod";

export const SexSchema = z.enum(["male", "female"]);
export type Sex = z.infer<typeof SexSchema>;

export const InputSourceSchema = z.enum(["doctor_manual", "doctor_upload", "parent_manual", "parent_upload"]);
export type InputSource = z.infer<typeof InputSourceSchema>;

export const ConfirmedMetricSchema = z.object({
  key: z.enum(["heightCm", "weightKg", "leftVision", "rightVision"]),
  value: z.number(),
  unit: z.enum(["cm", "kg", "decimal_vision"]),
  confirmedBy: z.enum(["doctor", "parent"]),
  confirmedAt: z.string().datetime()
});
export type ConfirmedMetric = z.infer<typeof ConfirmedMetricSchema>;

export const OcrFieldSchema = z.object({
  key: z.string(),
  rawText: z.string(),
  normalizedValue: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  page: z.number().int().min(1).optional()
});
export type OcrField = z.infer<typeof OcrFieldSchema>;

export const CreateCheckupRequestSchema = z.object({
  childName: z.string().min(1).max(40),
  childSex: SexSchema,
  childBirthDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  source: InputSourceSchema,
  metrics: z.array(ConfirmedMetricSchema).min(1),
  uploadedFileUrl: z.string().url().optional()
});
export type CreateCheckupRequest = z.infer<typeof CreateCheckupRequestSchema>;

export const CheckupRecordSchema = CreateCheckupRequestSchema.extend({
  id: z.string(),
  childId: z.string(),
  createdAt: z.string().datetime(),
  ocrFields: z.array(OcrFieldSchema).default([])
});
export type CheckupRecord = z.infer<typeof CheckupRecordSchema>;
```

- [ ] **Step 2: Write report schemas**

Create `packages/contracts/src/report.schema.ts`:

```ts
import { z } from "zod";

export const AbnormalityTypeSchema = z.enum(["overweight_obesity", "growth_delay", "vision_abnormality"]);
export type AbnormalityType = z.infer<typeof AbnormalityTypeSchema>;

export const AbnormalityLevelSchema = z.enum(["normal", "mild", "moderate", "severe", "unable_to_evaluate"]);
export type AbnormalityLevel = z.infer<typeof AbnormalityLevelSchema>;

export const RuleEvaluationSchema = z.object({
  id: z.string(),
  checkupId: z.string(),
  type: AbnormalityTypeSchema,
  level: AbnormalityLevelSchema,
  standardVersion: z.string(),
  evidence: z.array(z.string()),
  recommendedDepartment: z.string(),
  interventionTags: z.array(z.string()),
  defaultFollowUpDays: z.number().int().positive().nullable()
});
export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;

export const ParentReportContentSchema = z.object({
  summary: z.string().min(1),
  indicatorExplanation: z.string().min(1),
  abnormalMeaning: z.string().min(1),
  departmentAdvice: z.string().min(1),
  homeIntervention: z.string().min(1),
  followUpAdvice: z.string().min(1),
  posterTitle: z.string().min(1).max(30),
  posterBullets: z.array(z.string().min(1).max(40)).min(2).max(4)
});
export type ParentReportContent = z.infer<typeof ParentReportContentSchema>;

export const AiReportDraftSchema = z.object({
  id: z.string(),
  checkupId: z.string(),
  modelProvider: z.string(),
  modelVersion: z.string(),
  content: ParentReportContentSchema,
  createdAt: z.string().datetime()
});
export type AiReportDraft = z.infer<typeof AiReportDraftSchema>;

export const DoctorReviewSchema = z.object({
  id: z.string(),
  reportDraftId: z.string(),
  status: z.enum(["draft", "approved", "sent"]),
  editedContent: ParentReportContentSchema,
  reviewedByDoctorId: z.string(),
  reviewedAt: z.string().datetime().nullable()
});
export type DoctorReview = z.infer<typeof DoctorReviewSchema>;
```

- [ ] **Step 3: Write follow-up schemas**

Create `packages/contracts/src/followup.schema.ts`:

```ts
import { z } from "zod";

export const FollowUpTaskSchema = z.object({
  id: z.string(),
  checkupId: z.string(),
  ruleEvaluationId: z.string(),
  reason: z.string(),
  plannedAt: z.string().datetime(),
  channel: z.enum(["wechat", "sms"]),
  status: z.enum(["pending", "sent", "failed", "completed", "cancelled"]),
  createdAt: z.string().datetime()
});
export type FollowUpTask = z.infer<typeof FollowUpTaskSchema>;
```

- [ ] **Step 4: Write shared errors**

Create `packages/contracts/src/errors.ts`:

```ts
export const ErrorCode = {
  MissingConfirmedMetric: "MISSING_CONFIRMED_METRIC",
  UnsupportedAgeRange: "UNSUPPORTED_AGE_RANGE",
  OcrLowConfidence: "OCR_LOW_CONFIDENCE",
  AiOutputInvalid: "AI_OUTPUT_INVALID",
  ReportRequiresDoctorReview: "REPORT_REQUIRES_DOCTOR_REVIEW"
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

- [ ] **Step 5: Export contracts**

Replace `packages/contracts/src/index.ts` with:

```ts
export * from "./checkup.schema.js";
export * from "./report.schema.js";
export * from "./followup.schema.js";
export * from "./errors.js";
```

- [ ] **Step 6: Verify contracts**

Run: `pnpm --filter @child-health/contracts typecheck`

Expected: typecheck passes.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src
git commit -m "feat: define shared checkup report contracts"
```

---

### Task 3: Scaffold Backend App

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`

- [ ] **Step 1: Add API package manifest**

Create `apps/api/package.json`:

```json
{
  "name": "@child-health/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@child-health/contracts": "workspace:*",
    "@fastify/cors": "^9.0.1",
    "fastify": "^4.28.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.3",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Add TypeScript and Vitest config**

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Create `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 3: Add config module**

Create `apps/api/src/config.ts`:

```ts
export type AppConfig = {
  port: number;
  aiProvider: "local";
  ocrProvider: "local";
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.API_PORT ?? 8787),
    aiProvider: "local",
    ocrProvider: "local"
  };
}
```

- [ ] **Step 4: Add Fastify app**

Create `apps/api/src/app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "child-health-api"
  }));

  return app;
}
```

- [ ] **Step 5: Add server entrypoint**

Create `apps/api/src/server.ts`:

```ts
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp();

await app.listen({ port: config.port, host: "0.0.0.0" });
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install`

Expected: API dependencies are added to the lockfile.

Run: `pnpm --filter @child-health/api typecheck`

Expected: typecheck passes.

- [ ] **Step 7: Commit**

```bash
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat: scaffold backend API"
```

---

### Task 4: Implement Rule Engine

**Files:**
- Create: `apps/api/src/modules/rules/child-growth.rules.ts`
- Create: `apps/api/src/modules/rules/vision.rules.ts`
- Create: `apps/api/src/modules/rules/rules.service.ts`
- Create: `apps/api/tests/rules.service.test.ts`

- [ ] **Step 1: Write failing rule tests**

Create `apps/api/tests/rules.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateCheckupRules } from "../src/modules/rules/rules.service.js";

const baseCheckup = {
  id: "checkup_1",
  childId: "child_1",
  childName: "小明",
  childSex: "male" as const,
  childBirthDate: "2020-06-24",
  source: "doctor_manual" as const,
  createdAt: "2026-06-24T08:00:00.000Z",
  uploadedFileUrl: undefined,
  ocrFields: [],
  metrics: [
    { key: "heightCm" as const, value: 105, unit: "cm" as const, confirmedBy: "doctor" as const, confirmedAt: "2026-06-24T08:00:00.000Z" },
    { key: "weightKg" as const, value: 24, unit: "kg" as const, confirmedBy: "doctor" as const, confirmedAt: "2026-06-24T08:00:00.000Z" },
    { key: "leftVision" as const, value: 0.6, unit: "decimal_vision" as const, confirmedBy: "doctor" as const, confirmedAt: "2026-06-24T08:00:00.000Z" },
    { key: "rightVision" as const, value: 0.7, unit: "decimal_vision" as const, confirmedBy: "doctor" as const, confirmedAt: "2026-06-24T08:00:00.000Z" }
  ]
};

describe("evaluateCheckupRules", () => {
  it("flags overweight or obesity from BMI for a 6-year-old child", () => {
    const results = evaluateCheckupRules(baseCheckup, new Date("2026-06-24T08:00:00.000Z"));
    const growth = results.find((item) => item.type === "overweight_obesity");
    expect(growth?.level).toBe("moderate");
    expect(growth?.recommendedDepartment).toBe("儿童保健科");
    expect(growth?.defaultFollowUpDays).toBe(30);
  });

  it("flags growth delay from very low height", () => {
    const results = evaluateCheckupRules(
      {
        ...baseCheckup,
        metrics: baseCheckup.metrics.map((metric) => metric.key === "heightCm" ? { ...metric, value: 95 } : metric)
      },
      new Date("2026-06-24T08:00:00.000Z")
    );
    const result = results.find((item) => item.type === "growth_delay");
    expect(result?.level).toBe("moderate");
    expect(result?.recommendedDepartment).toBe("儿童保健科");
    expect(result?.defaultFollowUpDays).toBe(30);
  });

  it("flags vision abnormality when either eye is below age threshold", () => {
    const results = evaluateCheckupRules(baseCheckup, new Date("2026-06-24T08:00:00.000Z"));
    const result = results.find((item) => item.type === "vision_abnormality");
    expect(result?.level).toBe("moderate");
    expect(result?.recommendedDepartment).toBe("眼科");
    expect(result?.defaultFollowUpDays).toBe(30);
  });

  it("marks unable_to_evaluate when required metrics are missing", () => {
    const results = evaluateCheckupRules({ ...baseCheckup, metrics: [] }, new Date("2026-06-24T08:00:00.000Z"));
    expect(results.every((item) => item.level === "unable_to_evaluate")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @child-health/api test -- rules.service.test.ts`

Expected: FAIL because rule modules do not exist.

- [ ] **Step 3: Implement child growth helpers**

Create `apps/api/src/modules/rules/child-growth.rules.ts`:

```ts
import type { AbnormalityLevel, Sex } from "@child-health/contracts";

export const CHILD_GROWTH_STANDARD_VERSION = "MVP-local-reference-2026-06";

type BmiBand = {
  minAgeYears: number;
  maxAgeYears: number;
  overweightBmi: number;
  obesityBmi: number;
  shortHeightCm: number;
  severeShortHeightCm: number;
};

const bands: Record<Sex, BmiBand[]> = {
  male: [
    { minAgeYears: 2, maxAgeYears: 5, overweightBmi: 17.8, obesityBmi: 19.4, shortHeightCm: 98, severeShortHeightCm: 94 },
    { minAgeYears: 6, maxAgeYears: 8, overweightBmi: 18.5, obesityBmi: 20.5, shortHeightCm: 106, severeShortHeightCm: 100 },
    { minAgeYears: 9, maxAgeYears: 12, overweightBmi: 21.0, obesityBmi: 24.0, shortHeightCm: 128, severeShortHeightCm: 122 }
  ],
  female: [
    { minAgeYears: 2, maxAgeYears: 5, overweightBmi: 17.6, obesityBmi: 19.1, shortHeightCm: 97, severeShortHeightCm: 93 },
    { minAgeYears: 6, maxAgeYears: 8, overweightBmi: 18.3, obesityBmi: 20.2, shortHeightCm: 105, severeShortHeightCm: 99 },
    { minAgeYears: 9, maxAgeYears: 12, overweightBmi: 20.8, obesityBmi: 23.6, shortHeightCm: 127, severeShortHeightCm: 121 }
  ]
};

export function ageInYears(birthDate: string, at: Date): number {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  return Math.floor((at.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function findBand(sex: Sex, ageYears: number): BmiBand | undefined {
  return bands[sex].find((band) => ageYears >= band.minAgeYears && ageYears <= band.maxAgeYears);
}

export function evaluateBmiLevel(sex: Sex, ageYears: number, heightCm: number, weightKg: number): AbnormalityLevel {
  const band = findBand(sex, ageYears);
  if (!band) return "unable_to_evaluate";
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  if (bmi >= band.obesityBmi) return "moderate";
  if (bmi >= band.overweightBmi) return "mild";
  return "normal";
}

export function evaluateHeightLevel(sex: Sex, ageYears: number, heightCm: number): AbnormalityLevel {
  const band = findBand(sex, ageYears);
  if (!band) return "unable_to_evaluate";
  if (heightCm < band.severeShortHeightCm) return "severe";
  if (heightCm < band.shortHeightCm) return "moderate";
  return "normal";
}
```

- [ ] **Step 4: Implement vision helper**

Create `apps/api/src/modules/rules/vision.rules.ts`:

```ts
import type { AbnormalityLevel } from "@child-health/contracts";

export const VISION_STANDARD_VERSION = "MVP-local-reference-2026-06";

export function evaluateVisionLevel(ageYears: number, leftVision: number, rightVision: number): AbnormalityLevel {
  const minExpectedVision = ageYears < 5 ? 0.6 : 0.8;
  const worst = Math.min(leftVision, rightVision);
  if (worst < minExpectedVision - 0.2) return "moderate";
  if (worst < minExpectedVision) return "mild";
  return "normal";
}
```

- [ ] **Step 5: Implement rule service**

Create `apps/api/src/modules/rules/rules.service.ts`:

```ts
import type { CheckupRecord, ConfirmedMetric, RuleEvaluation } from "@child-health/contracts";
import { randomUUID } from "node:crypto";
import { CHILD_GROWTH_STANDARD_VERSION, ageInYears, evaluateBmiLevel, evaluateHeightLevel } from "./child-growth.rules.js";
import { VISION_STANDARD_VERSION, evaluateVisionLevel } from "./vision.rules.js";

function metricValue(metrics: ConfirmedMetric[], key: ConfirmedMetric["key"]): number | undefined {
  return metrics.find((metric) => metric.key === key)?.value;
}

function unable(checkupId: string, type: RuleEvaluation["type"], department: string): RuleEvaluation {
  return {
    id: randomUUID(),
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

export function evaluateCheckupRules(checkup: CheckupRecord, at: Date = new Date()): RuleEvaluation[] {
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
      id: randomUUID(),
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
      id: randomUUID(),
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
      id: randomUUID(),
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
```

- [ ] **Step 6: Run rule tests**

Run: `pnpm --filter @child-health/api test -- rules.service.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/rules apps/api/tests/rules.service.test.ts
git commit -m "feat: add child checkup rule engine"
```

---

### Task 5: Add In-Memory Persistence And Checkup Intake

**Files:**
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/modules/audit/audit.service.ts`
- Create: `apps/api/src/modules/ocr/ocr.adapter.ts`
- Create: `apps/api/src/modules/checkups/checkups.service.ts`
- Create: `apps/api/src/modules/checkups/checkups.routes.ts`
- Create: `apps/api/tests/checkups.service.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing checkup service tests**

Create `apps/api/tests/checkups.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../src/db/client.js";
import { createCheckup } from "../src/modules/checkups/checkups.service.js";

describe("createCheckup", () => {
  it("stores confirmed metrics and evaluates rules", async () => {
    const store = createMemoryStore();
    const record = await createCheckup(store, {
      childName: "小明",
      childSex: "male",
      childBirthDate: "2020-06-24",
      source: "doctor_manual",
      metrics: [
        { key: "heightCm", value: 105, unit: "cm", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
        { key: "weightKg", value: 24, unit: "kg", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
        { key: "leftVision", value: 0.6, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
        { key: "rightVision", value: 0.7, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" }
      ]
    }, new Date("2026-06-24T08:00:00.000Z"));

    expect(record.checkup.childName).toBe("小明");
    expect(record.ruleEvaluations).toHaveLength(3);
    expect(store.auditLogs).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @child-health/api test -- checkups.service.test.ts`

Expected: FAIL because persistence and checkup service do not exist.

- [ ] **Step 3: Add memory store**

Create `apps/api/src/db/client.ts`:

```ts
import type { AiReportDraft, CheckupRecord, DoctorReview, FollowUpTask, RuleEvaluation } from "@child-health/contracts";

export type AuditLog = {
  id: string;
  action: string;
  entityId: string;
  payload: unknown;
  createdAt: string;
};

export type MemoryStore = {
  checkups: CheckupRecord[];
  ruleEvaluations: RuleEvaluation[];
  aiDrafts: AiReportDraft[];
  doctorReviews: DoctorReview[];
  followUps: FollowUpTask[];
  auditLogs: AuditLog[];
};

export function createMemoryStore(): MemoryStore {
  return {
    checkups: [],
    ruleEvaluations: [],
    aiDrafts: [],
    doctorReviews: [],
    followUps: [],
    auditLogs: []
  };
}

export const store = createMemoryStore();
```

- [ ] **Step 4: Add audit service**

Create `apps/api/src/modules/audit/audit.service.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { MemoryStore } from "../../db/client.js";

export function writeAuditLog(store: MemoryStore, action: string, entityId: string, payload: unknown, at: Date = new Date()) {
  store.auditLogs.push({
    id: randomUUID(),
    action,
    entityId,
    payload,
    createdAt: at.toISOString()
  });
}
```

- [ ] **Step 5: Add local OCR adapter**

Create `apps/api/src/modules/ocr/ocr.adapter.ts`:

```ts
import type { OcrField } from "@child-health/contracts";

export type OcrAdapter = {
  extract(fileUrl: string): Promise<OcrField[]>;
};

export class LocalOcrAdapter implements OcrAdapter {
  async extract(fileUrl: string): Promise<OcrField[]> {
    return [
      { key: "heightCm", rawText: `OCR demo height from ${fileUrl}`, normalizedValue: 105, confidence: 0.82, page: 1 },
      { key: "weightKg", rawText: `OCR demo weight from ${fileUrl}`, normalizedValue: 24, confidence: 0.8, page: 1 },
      { key: "leftVision", rawText: `OCR demo left vision from ${fileUrl}`, normalizedValue: 0.6, confidence: 0.76, page: 1 },
      { key: "rightVision", rawText: `OCR demo right vision from ${fileUrl}`, normalizedValue: 0.7, confidence: 0.77, page: 1 }
    ];
  }
}
```

- [ ] **Step 6: Implement checkup service**

Create `apps/api/src/modules/checkups/checkups.service.ts`:

```ts
import { CreateCheckupRequestSchema, type CreateCheckupRequest } from "@child-health/contracts";
import { randomUUID } from "node:crypto";
import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { evaluateCheckupRules } from "../rules/rules.service.js";

export async function createCheckup(store: MemoryStore, input: CreateCheckupRequest, at: Date = new Date()) {
  const data = CreateCheckupRequestSchema.parse(input);
  const childId = randomUUID();
  const checkup = {
    ...data,
    id: randomUUID(),
    childId,
    createdAt: at.toISOString(),
    ocrFields: []
  };
  const ruleEvaluations = evaluateCheckupRules(checkup, at);

  store.checkups.push(checkup);
  store.ruleEvaluations.push(...ruleEvaluations);
  writeAuditLog(store, "checkup.created", checkup.id, { source: checkup.source }, at);
  writeAuditLog(store, "rules.evaluated", checkup.id, { count: ruleEvaluations.length }, at);

  return { checkup, ruleEvaluations };
}
```

- [ ] **Step 7: Add checkup routes**

Create `apps/api/src/modules/checkups/checkups.routes.ts`:

```ts
import type { FastifyInstance } from "fastify";
import { store } from "../../db/client.js";
import { createCheckup } from "./checkups.service.js";

export async function registerCheckupRoutes(app: FastifyInstance) {
  app.post("/checkups", async (request, reply) => {
    const result = await createCheckup(store, request.body as never);
    return reply.code(201).send(result);
  });

  app.get("/checkups/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const checkup = store.checkups.find((item) => item.id === id);
    if (!checkup) return reply.code(404).send({ message: "Checkup not found" });
    return { checkup, ruleEvaluations: store.ruleEvaluations.filter((item) => item.checkupId === id) };
  });
}
```

- [ ] **Step 8: Register routes**

Modify `apps/api/src/app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerCheckupRoutes } from "./modules/checkups/checkups.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "child-health-api"
  }));

  await registerCheckupRoutes(app);

  return app;
}
```

- [ ] **Step 9: Run tests**

Run: `pnpm --filter @child-health/api test -- checkups.service.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/db apps/api/src/modules/audit apps/api/src/modules/ocr apps/api/src/modules/checkups apps/api/src/app.ts apps/api/tests/checkups.service.test.ts
git commit -m "feat: add checkup intake workflow"
```

---

### Task 6: Add AI Report Drafts And Doctor Review

**Files:**
- Create: `apps/api/src/modules/reports/ai-composer.adapter.ts`
- Create: `apps/api/src/modules/reports/reports.service.ts`
- Create: `apps/api/src/modules/reports/reports.routes.ts`
- Create: `apps/api/tests/reports.service.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing report tests**

Create `apps/api/tests/reports.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../src/db/client.js";
import { createCheckup } from "../src/modules/checkups/checkups.service.js";
import { approveDoctorReview, createReportDraft } from "../src/modules/reports/reports.service.js";

async function seedCheckup(store: ReturnType<typeof createMemoryStore>) {
  return createCheckup(store, {
    childName: "小明",
    childSex: "male",
    childBirthDate: "2020-06-24",
    source: "doctor_manual",
    metrics: [
      { key: "heightCm", value: 105, unit: "cm", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
      { key: "weightKg", value: 24, unit: "kg", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
      { key: "leftVision", value: 0.6, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
      { key: "rightVision", value: 0.7, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" }
    ]
  }, new Date("2026-06-24T08:00:00.000Z"));
}

describe("reports service", () => {
  it("creates a parent-facing AI draft from rule outputs", async () => {
    const store = createMemoryStore();
    const { checkup } = await seedCheckup(store);
    const draft = await createReportDraft(store, checkup.id, new Date("2026-06-24T08:00:00.000Z"));
    expect(draft.content.departmentAdvice).toContain("儿童保健科");
    expect(draft.content.posterBullets.length).toBeGreaterThanOrEqual(2);
  });

  it("creates approved doctor review without changing rule levels", async () => {
    const store = createMemoryStore();
    const { checkup } = await seedCheckup(store);
    const draft = await createReportDraft(store, checkup.id, new Date("2026-06-24T08:00:00.000Z"));
    const review = approveDoctorReview(store, draft.id, "doctor_1", draft.content, new Date("2026-06-24T09:00:00.000Z"));
    expect(review.status).toBe("approved");
    expect(store.ruleEvaluations.find((item) => item.checkupId === checkup.id)?.level).toBe("moderate");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @child-health/api test -- reports.service.test.ts`

Expected: FAIL because report modules do not exist.

- [ ] **Step 3: Add local AI composer**

Create `apps/api/src/modules/reports/ai-composer.adapter.ts`:

```ts
import { ParentReportContentSchema, type CheckupRecord, type ParentReportContent, type RuleEvaluation } from "@child-health/contracts";

export type AiComposer = {
  compose(checkup: CheckupRecord, evaluations: RuleEvaluation[]): Promise<ParentReportContent>;
};

export class LocalAiComposer implements AiComposer {
  async compose(checkup: CheckupRecord, evaluations: RuleEvaluation[]): Promise<ParentReportContent> {
    const abnormal = evaluations.filter((item) => item.level !== "normal" && item.level !== "unable_to_evaluate");
    const departments = [...new Set(abnormal.map((item) => item.recommendedDepartment))];
    const tags = [...new Set(abnormal.flatMap((item) => item.interventionTags))];
    const content = {
      summary: `${checkup.childName}本次体检发现${abnormal.length}项需要关注的结果。`,
      indicatorExplanation: "系统根据已确认的身高、体重和视力数据进行规则化评估。",
      abnormalMeaning: abnormal.length > 0 ? "这些结果提示需要结合日常饮食、运动、用眼习惯和生长曲线继续观察。" : "本次纳入评估的指标未见明显异常。",
      departmentAdvice: departments.length > 0 ? `建议优先咨询${departments.join("、")}。` : "如家长仍有疑问，可咨询儿童保健科。",
      homeIntervention: tags.length > 0 ? `家庭可先从${tags.join("、")}开始。` : "继续保持规律作息、均衡饮食和户外活动。",
      followUpAdvice: abnormal.length > 0 ? "建议按系统生成的随访时间复查，并保留连续体检记录。" : "建议按常规儿童保健周期复查。",
      posterTitle: "儿童体检结果提醒",
      posterBullets: abnormal.length > 0 ? tags.slice(0, 4) : ["保持均衡饮食", "坚持户外活动"]
    };
    return ParentReportContentSchema.parse(content);
  }
}
```

- [ ] **Step 4: Implement reports service**

Create `apps/api/src/modules/reports/reports.service.ts`:

```ts
import { DoctorReviewSchema, ParentReportContentSchema, type ParentReportContent } from "@child-health/contracts";
import { randomUUID } from "node:crypto";
import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { LocalAiComposer } from "./ai-composer.adapter.js";

export async function createReportDraft(store: MemoryStore, checkupId: string, at: Date = new Date()) {
  const checkup = store.checkups.find((item) => item.id === checkupId);
  if (!checkup) throw new Error("Checkup not found");
  const evaluations = store.ruleEvaluations.filter((item) => item.checkupId === checkupId);
  if (evaluations.length === 0) throw new Error("Rule evaluations required before report generation");

  const composer = new LocalAiComposer();
  const content = await composer.compose(checkup, evaluations);
  const draft = {
    id: randomUUID(),
    checkupId,
    modelProvider: "local",
    modelVersion: "local-template-2026-06",
    content,
    createdAt: at.toISOString()
  };
  store.aiDrafts.push(draft);
  writeAuditLog(store, "ai_report.created", draft.id, { checkupId, modelProvider: draft.modelProvider }, at);
  return draft;
}

export function approveDoctorReview(store: MemoryStore, draftId: string, doctorId: string, editedContent: ParentReportContent, at: Date = new Date()) {
  const draft = store.aiDrafts.find((item) => item.id === draftId);
  if (!draft) throw new Error("Draft not found");
  const review = DoctorReviewSchema.parse({
    id: randomUUID(),
    reportDraftId: draftId,
    status: "approved",
    editedContent: ParentReportContentSchema.parse(editedContent),
    reviewedByDoctorId: doctorId,
    reviewedAt: at.toISOString()
  });
  store.doctorReviews.push(review);
  writeAuditLog(store, "doctor_review.approved", review.id, { draftId, doctorId }, at);
  return review;
}
```

- [ ] **Step 5: Add report routes**

Create `apps/api/src/modules/reports/reports.routes.ts`:

```ts
import type { FastifyInstance } from "fastify";
import { store } from "../../db/client.js";
import { approveDoctorReview, createReportDraft } from "./reports.service.js";

export async function registerReportRoutes(app: FastifyInstance) {
  app.post("/checkups/:id/report-drafts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const draft = await createReportDraft(store, id);
    return reply.code(201).send(draft);
  });

  app.post("/report-drafts/:id/doctor-review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { doctorId: string; editedContent: never };
    const review = approveDoctorReview(store, id, body.doctorId, body.editedContent);
    return reply.code(201).send(review);
  });
}
```

- [ ] **Step 6: Register report routes**

Modify `apps/api/src/app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerCheckupRoutes } from "./modules/checkups/checkups.routes.js";
import { registerReportRoutes } from "./modules/reports/reports.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "child-health-api"
  }));

  await registerCheckupRoutes(app);
  await registerReportRoutes(app);

  return app;
}
```

- [ ] **Step 7: Run report tests**

Run: `pnpm --filter @child-health/api test -- reports.service.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/reports apps/api/src/app.ts apps/api/tests/reports.service.test.ts
git commit -m "feat: add AI report draft and doctor review"
```

---

### Task 7: Add Poster And Follow-Up Services

**Files:**
- Create: `apps/api/src/modules/posters/poster.service.ts`
- Create: `apps/api/src/modules/followups/followups.service.ts`
- Create: `apps/api/tests/followups.service.test.ts`

- [ ] **Step 1: Write failing follow-up tests**

Create `apps/api/tests/followups.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../src/db/client.js";
import { createFollowUpsForCheckup } from "../src/modules/followups/followups.service.js";
import { renderPosterSvg } from "../src/modules/posters/poster.service.js";

describe("followups and posters", () => {
  it("creates follow-up tasks for abnormal rule evaluations", () => {
    const store = createMemoryStore();
    store.ruleEvaluations.push({
      id: "rule_1",
      checkupId: "checkup_1",
      type: "vision_abnormality",
      level: "moderate",
      standardVersion: "MVP-local-reference-2026-06",
      evidence: ["左眼视力0.6"],
      recommendedDepartment: "眼科",
      interventionTags: ["增加户外活动"],
      defaultFollowUpDays: 30
    });
    const tasks = createFollowUpsForCheckup(store, "checkup_1", new Date("2026-06-24T08:00:00.000Z"));
    expect(tasks).toHaveLength(1);
    expect(tasks[0].plannedAt).toBe("2026-07-24T08:00:00.000Z");
  });

  it("renders an SVG poster from approved report content", () => {
    const svg = renderPosterSvg({
      summary: "本次体检发现1项需要关注的结果。",
      indicatorExplanation: "视力低于年龄参考值。",
      abnormalMeaning: "建议关注用眼习惯。",
      departmentAdvice: "建议咨询眼科。",
      homeIntervention: "增加户外活动。",
      followUpAdvice: "建议1个月后复查。",
      posterTitle: "视力复查提醒",
      posterBullets: ["增加户外活动", "减少近距离用眼"]
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("视力复查提醒");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @child-health/api test -- followups.service.test.ts`

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement poster service**

Create `apps/api/src/modules/posters/poster.service.ts`:

```ts
import type { ParentReportContent } from "@child-health/contracts";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderPosterSvg(content: ParentReportContent): string {
  const bullets = content.posterBullets
    .map((bullet, index) => `<text x="72" y="${300 + index * 48}" font-size="28" fill="#1f2937">• ${escapeXml(bullet)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1000" viewBox="0 0 750 1000">
  <rect width="750" height="1000" fill="#f8fafc"/>
  <rect x="44" y="44" width="662" height="912" rx="24" fill="#ffffff" stroke="#d7dee8"/>
  <text x="72" y="130" font-size="42" font-weight="700" fill="#0f172a">${escapeXml(content.posterTitle)}</text>
  <text x="72" y="200" font-size="26" fill="#475569">${escapeXml(content.summary)}</text>
  <text x="72" y="260" font-size="30" font-weight="600" fill="#0f766e">家庭行动建议</text>
  ${bullets}
  <text x="72" y="900" font-size="22" fill="#64748b">本内容为健康科普，不替代医生面诊。</text>
</svg>`;
}
```

- [ ] **Step 4: Implement follow-up service**

Create `apps/api/src/modules/followups/followups.service.ts`:

```ts
import type { FollowUpTask } from "@child-health/contracts";
import { randomUUID } from "node:crypto";
import type { MemoryStore } from "../../db/client.js";
import { writeAuditLog } from "../audit/audit.service.js";

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function createFollowUpsForCheckup(store: MemoryStore, checkupId: string, at: Date = new Date()): FollowUpTask[] {
  const evaluations = store.ruleEvaluations.filter((item) => item.checkupId === checkupId && item.defaultFollowUpDays !== null && item.level !== "normal" && item.level !== "unable_to_evaluate");
  const tasks = evaluations.map((evaluation) => ({
    id: randomUUID(),
    checkupId,
    ruleEvaluationId: evaluation.id,
    reason: `${evaluation.recommendedDepartment}复查：${evaluation.type}`,
    plannedAt: addDays(at, evaluation.defaultFollowUpDays ?? 30).toISOString(),
    channel: "wechat" as const,
    status: "pending" as const,
    createdAt: at.toISOString()
  }));
  store.followUps.push(...tasks);
  for (const task of tasks) {
    writeAuditLog(store, "followup.created", task.id, { checkupId, plannedAt: task.plannedAt }, at);
  }
  return tasks;
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @child-health/api test -- followups.service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/posters apps/api/src/modules/followups apps/api/tests/followups.service.test.ts
git commit -m "feat: add poster rendering and followups"
```

---

### Task 8: Scaffold WeChat Mini Program Pages

**Files:**
- Create: `apps/miniprogram/app.json`
- Create: `apps/miniprogram/app.ts`
- Create: `apps/miniprogram/app.wxss`
- Create: `apps/miniprogram/project.config.json`
- Create: `apps/miniprogram/sitemap.json`
- Create: `apps/miniprogram/src/api/types.ts`
- Create: `apps/miniprogram/src/api/client.ts`
- Create: listed page files under `apps/miniprogram/src/pages`

- [ ] **Step 1: Add mini program config**

Create `apps/miniprogram/app.json`:

```json
{
  "pages": [
    "src/pages/doctor/checkup-edit/checkup-edit",
    "src/pages/doctor/review/review",
    "src/pages/parent/self-check/self-check",
    "src/pages/parent/report/report"
  ],
  "window": {
    "navigationBarTitleText": "儿童体检解读",
    "navigationBarBackgroundColor": "#0f766e",
    "navigationBarTextStyle": "white"
  }
}
```

Create `apps/miniprogram/app.ts`:

```ts
App({});
```

Create `apps/miniprogram/app.wxss`:

```css
page {
  background: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.page {
  padding: 24rpx;
}

.section {
  background: #ffffff;
  border: 1rpx solid #d7dee8;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.primary {
  background: #0f766e;
  color: #ffffff;
}
```

Create `apps/miniprogram/project.config.json`:

```json
{
  "appid": "touristappid",
  "projectname": "child-health-explain-ai",
  "miniprogramRoot": "./",
  "compileType": "miniprogram"
}
```

Create `apps/miniprogram/sitemap.json`:

```json
{
  "rules": [{ "action": "allow", "page": "*" }]
}
```

- [ ] **Step 2: Add mini program API client**

Create `apps/miniprogram/src/api/types.ts`:

```ts
export type MetricInput = {
  key: "heightCm" | "weightKg" | "leftVision" | "rightVision";
  value: number;
  unit: "cm" | "kg" | "decimal_vision";
};

export type ReportContent = {
  summary: string;
  indicatorExplanation: string;
  abnormalMeaning: string;
  departmentAdvice: string;
  homeIntervention: string;
  followUpAdvice: string;
  posterTitle: string;
  posterBullets: string[];
};
```

Create `apps/miniprogram/src/api/client.ts`:

```ts
const API_BASE_URL = "http://localhost:8787";

export function request<T>(path: string, method: "GET" | "POST", data?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      success: (res) => resolve(res.data as T),
      fail: reject
    });
  });
}
```

- [ ] **Step 3: Add doctor checkup edit page**

Create `apps/miniprogram/src/pages/doctor/checkup-edit/checkup-edit.wxml`:

```xml
<view class="page">
  <view class="section">
    <view class="title">医生端录入</view>
    <input placeholder="儿童姓名" value="{{childName}}" bindinput="onNameInput" />
    <input placeholder="出生日期 YYYY-MM-DD" value="{{childBirthDate}}" bindinput="onBirthDateInput" />
    <input placeholder="身高 cm" type="digit" value="{{heightCm}}" bindinput="onHeightInput" />
    <input placeholder="体重 kg" type="digit" value="{{weightKg}}" bindinput="onWeightInput" />
    <input placeholder="左眼视力" type="digit" value="{{leftVision}}" bindinput="onLeftVisionInput" />
    <input placeholder="右眼视力" type="digit" value="{{rightVision}}" bindinput="onRightVisionInput" />
    <button class="primary" bindtap="submit">生成解读草稿</button>
  </view>
</view>
```

Create `apps/miniprogram/src/pages/doctor/checkup-edit/checkup-edit.ts`:

```ts
import { request } from "../../../api/client";

Page({
  data: {
    childName: "",
    childBirthDate: "2020-06-24",
    heightCm: "",
    weightKg: "",
    leftVision: "",
    rightVision: ""
  },
  onNameInput(event: WechatMiniprogram.Input) { this.setData({ childName: event.detail.value }); },
  onBirthDateInput(event: WechatMiniprogram.Input) { this.setData({ childBirthDate: event.detail.value }); },
  onHeightInput(event: WechatMiniprogram.Input) { this.setData({ heightCm: event.detail.value }); },
  onWeightInput(event: WechatMiniprogram.Input) { this.setData({ weightKg: event.detail.value }); },
  onLeftVisionInput(event: WechatMiniprogram.Input) { this.setData({ leftVision: event.detail.value }); },
  onRightVisionInput(event: WechatMiniprogram.Input) { this.setData({ rightVision: event.detail.value }); },
  async submit() {
    const now = new Date().toISOString();
    const result = await request<{ checkup: { id: string } }>("/checkups", "POST", {
      childName: this.data.childName,
      childSex: "male",
      childBirthDate: this.data.childBirthDate,
      source: "doctor_manual",
      metrics: [
        { key: "heightCm", value: Number(this.data.heightCm), unit: "cm", confirmedBy: "doctor", confirmedAt: now },
        { key: "weightKg", value: Number(this.data.weightKg), unit: "kg", confirmedBy: "doctor", confirmedAt: now },
        { key: "leftVision", value: Number(this.data.leftVision), unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: now },
        { key: "rightVision", value: Number(this.data.rightVision), unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: now }
      ]
    });
    wx.navigateTo({ url: `/src/pages/doctor/review/review?checkupId=${result.checkup.id}` });
  }
});
```

Create `apps/miniprogram/src/pages/doctor/checkup-edit/checkup-edit.wxss`:

```css
.title { font-size: 36rpx; font-weight: 700; margin-bottom: 20rpx; }
input { background: #f8fafc; border: 1rpx solid #cbd5e1; border-radius: 8rpx; padding: 18rpx; margin-bottom: 16rpx; }
```

- [ ] **Step 4: Add doctor review page**

Create `apps/miniprogram/src/pages/doctor/review/review.wxml`:

```xml
<view class="page">
  <view class="section">
    <view class="title">医生审核</view>
    <text>{{summary}}</text>
    <textarea value="{{homeIntervention}}" bindinput="onHomeInterventionInput" />
    <button class="primary" bindtap="approve">确认审核</button>
  </view>
</view>
```

Create `apps/miniprogram/src/pages/doctor/review/review.ts`:

```ts
import { request } from "../../../api/client";
import type { ReportContent } from "../../../api/types";

Page({
  data: {
    checkupId: "",
    draftId: "",
    summary: "",
    homeIntervention: "",
    content: null as ReportContent | null
  },
  async onLoad(query: { checkupId?: string }) {
    const checkupId = query.checkupId ?? "";
    const draft = await request<{ id: string; content: ReportContent }>(`/checkups/${checkupId}/report-drafts`, "POST");
    this.setData({ checkupId, draftId: draft.id, summary: draft.content.summary, homeIntervention: draft.content.homeIntervention, content: draft.content });
  },
  onHomeInterventionInput(event: WechatMiniprogram.Input) { this.setData({ homeIntervention: event.detail.value }); },
  async approve() {
    if (!this.data.content) return;
    await request(`/report-drafts/${this.data.draftId}/doctor-review`, "POST", {
      doctorId: "doctor_demo",
      editedContent: { ...this.data.content, homeIntervention: this.data.homeIntervention }
    });
    wx.showToast({ title: "已审核" });
  }
});
```

Create `apps/miniprogram/src/pages/doctor/review/review.wxss`:

```css
.title { font-size: 36rpx; font-weight: 700; margin-bottom: 20rpx; }
textarea { min-height: 240rpx; background: #f8fafc; border: 1rpx solid #cbd5e1; border-radius: 8rpx; padding: 18rpx; margin-top: 16rpx; }
```

- [ ] **Step 5: Add parent self-check and report pages**

Create `apps/miniprogram/src/pages/parent/self-check/self-check.wxml`:

```xml
<view class="page">
  <view class="section">
    <view class="title">家长自查</view>
    <text class="notice">本内容为健康科普，不替代医生面诊。</text>
    <button class="primary" bindtap="startDemo">查看示例报告</button>
  </view>
</view>
```

Create `apps/miniprogram/src/pages/parent/self-check/self-check.ts`:

```ts
Page({
  startDemo() {
    wx.navigateTo({ url: "/src/pages/parent/report/report" });
  }
});
```

Create `apps/miniprogram/src/pages/parent/self-check/self-check.wxss`:

```css
.title { font-size: 36rpx; font-weight: 700; margin-bottom: 20rpx; }
.notice { display: block; color: #64748b; margin-bottom: 24rpx; }
```

Create `apps/miniprogram/src/pages/parent/report/report.wxml`:

```xml
<view class="page">
  <view class="section">
    <view class="title">体检科普报告</view>
    <text>请从医生分享链接或自查流程进入报告详情。</text>
  </view>
</view>
```

Create `apps/miniprogram/src/pages/parent/report/report.ts`:

```ts
Page({});
```

Create `apps/miniprogram/src/pages/parent/report/report.wxss`:

```css
.title { font-size: 36rpx; font-weight: 700; margin-bottom: 20rpx; }
```

- [ ] **Step 6: Commit**

```bash
git add apps/miniprogram
git commit -m "feat: scaffold WeChat mini program MVP pages"
```

---

### Task 9: Add API Route Integration Test

**Files:**
- Create: `apps/api/tests/api.e2e.test.ts`

- [ ] **Step 1: Write route integration test**

Create `apps/api/tests/api.e2e.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("API MVP flow", () => {
  it("creates checkup then creates report draft", async () => {
    const app = await buildApp();
    const checkupResponse = await app.inject({
      method: "POST",
      url: "/checkups",
      payload: {
        childName: "小明",
        childSex: "male",
        childBirthDate: "2020-06-24",
        source: "doctor_manual",
        metrics: [
          { key: "heightCm", value: 105, unit: "cm", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
          { key: "weightKg", value: 24, unit: "kg", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
          { key: "leftVision", value: 0.6, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" },
          { key: "rightVision", value: 0.7, unit: "decimal_vision", confirmedBy: "doctor", confirmedAt: "2026-06-24T08:00:00.000Z" }
        ]
      }
    });
    expect(checkupResponse.statusCode).toBe(201);
    const checkupBody = checkupResponse.json<{ checkup: { id: string } }>();

    const draftResponse = await app.inject({
      method: "POST",
      url: `/checkups/${checkupBody.checkup.id}/report-drafts`
    });
    expect(draftResponse.statusCode).toBe(201);
    expect(draftResponse.json<{ content: { summary: string } }>().content.summary).toContain("小明");
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `pnpm --filter @child-health/api test -- api.e2e.test.ts`

Expected: PASS.

- [ ] **Step 3: Run all checks**

Run: `pnpm typecheck`

Expected: all packages pass typecheck.

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/api.e2e.test.ts
git commit -m "test: cover MVP API flow"
```

---

### Task 10: Update README With Local Run Instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README content**

Replace `README.md` with:

```md
# child-health-explain-ai

通过 AI 解读儿童体检报告的 MVP。第一版采用“规则核心 + AI 表达层”：

- 医生端和家长端双入口
- 手动录入或上传报告后的 OCR 确认
- 超重/肥胖、生长迟缓、视力异常三类规则判断
- 家长版科普文本和模板海报生成
- 医生审核和随访提醒

## Development

Install dependencies:

```bash
pnpm install
```

Run backend:

```bash
pnpm dev:api
```

Run checks:

```bash
pnpm typecheck
pnpm test
```

The WeChat mini program source lives in `apps/miniprogram` and can be opened with WeChat Developer Tools.
```

- [ ] **Step 2: Run final verification**

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add MVP development instructions"
```

---

## Self-Review Checklist

- Spec coverage:
  - Dual doctor and parent entries are covered by mini program pages and shared API contracts.
  - Manual intake is covered by `/checkups`.
  - OCR is represented by an adapter and preserved as an explicit future provider boundary; local OCR demo fields support the confirmation-page flow.
  - Three MVP abnormality classes are implemented in the rule engine.
  - AI report generation is implemented through an adapter that cannot override rule levels.
  - Template poster generation is implemented as SVG rendering.
  - Doctor review is implemented with approved review records.
  - Follow-up tasks are generated from abnormal rule evaluations.
  - Audit logs are written for checkup creation, rule evaluation, report draft, doctor approval, and follow-up creation.
- The first implementation deliberately uses in-memory persistence so the MVP can run before database hardening work.
- The plan contains no unresolved placeholder markers.
- Type names used across tasks match the contracts introduced in Task 2.
