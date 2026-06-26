import { describe, expect, test } from "vitest";

import { buildApp } from "../src/app.js";

describe("GET /health", () => {
  test("returns API health status", async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({ method: "GET", url: "/health" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: "ok",
        service: "child-health-api"
      });
    } finally {
      await app.close();
    }
  });
});
