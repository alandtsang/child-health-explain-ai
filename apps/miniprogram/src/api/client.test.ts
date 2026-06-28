import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "./client";

declare global {
  // eslint-disable-next-line no-var
  var wx: {
    request: ReturnType<typeof vi.fn>;
  };
}

describe("miniprogram API client", () => {
  beforeEach(() => {
    globalThis.wx = {
      request: vi.fn()
    };
  });

  it("sends an empty JSON object for POST requests without explicit data", async () => {
    const promise = request("/checkups/checkup_1/report-drafts", "POST");
    const options = globalThis.wx.request.mock.calls[0][0];

    options.success({ statusCode: 201, data: { id: "draft_1" } });

    await expect(promise).resolves.toEqual({ id: "draft_1" });
    expect(options.method).toBe("POST");
    expect(options.data).toEqual({});
  });
});
