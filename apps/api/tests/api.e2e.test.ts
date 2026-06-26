import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/db/client.js";

const confirmedAt = "2026-06-24T08:00:00.000Z";

const validCheckupPayload = {
  childName: "小明",
  childSex: "male",
  childBirthDate: "2020-06-24",
  source: "doctor_manual",
  metrics: [
    {
      key: "heightCm",
      value: 110,
      unit: "cm",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "weightKg",
      value: 22,
      unit: "kg",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "leftVision",
      value: 0.8,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt
    },
    {
      key: "rightVision",
      value: 0.9,
      unit: "decimal_vision",
      confirmedBy: "doctor",
      confirmedAt
    }
  ]
} as const;

describe("API integration flow", () => {
  it("creates a checkup and then creates a report draft for it", async () => {
    const store = createMemoryStore();
    const app = await buildApp(store);

    try {
      const checkupResponse = await app.inject({
        method: "POST",
        url: "/checkups",
        payload: validCheckupPayload
      });

      expect(checkupResponse.statusCode).toBe(201);
      const createdCheckup = checkupResponse.json();

      const draftResponse = await app.inject({
        method: "POST",
        url: `/checkups/${createdCheckup.checkup.id}/report-drafts`
      });

      expect(draftResponse.statusCode).toBe(201);
      expect(draftResponse.json()).toMatchObject({
        checkupId: createdCheckup.checkup.id,
        content: {
          summary: expect.stringContaining("小明")
        }
      });
    } finally {
      await app.close();
    }
  });
});
