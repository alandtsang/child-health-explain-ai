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
