import { z } from "zod";

export type AppConfig = {
  port: number;
  aiProvider: "local";
  ocrProvider: "local";
};

const apiPortSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return 8787;
    }

    if (typeof value === "string" && /^\d+$/.test(value)) {
      return Number(value);
    }

    return value;
  },
  z.number().int().min(1).max(65535)
);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const portResult = apiPortSchema.safeParse(env.API_PORT);

  if (!portResult.success) {
    throw new Error(`Invalid API_PORT: ${portResult.error.message}`);
  }

  return {
    port: portResult.data,
    aiProvider: "local",
    ocrProvider: "local"
  };
}
