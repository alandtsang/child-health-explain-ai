import { describe, expect, test } from "vitest";

import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  test("uses the default API port when API_PORT is missing", () => {
    expect(loadConfig({})).toEqual({
      port: 8787,
      aiProvider: "local",
      ocrProvider: "local"
    });
  });

  test("uses a valid API_PORT value from the environment", () => {
    expect(loadConfig({ API_PORT: "3000" })).toEqual({
      port: 3000,
      aiProvider: "local",
      ocrProvider: "local"
    });
  });

  test.each(["", "abc", "12.5", "0", "65536"])(
    "throws a clear error for invalid API_PORT value %j",
    (API_PORT) => {
      expect(() => loadConfig({ API_PORT })).toThrow(/API_PORT/);
    }
  );
});
