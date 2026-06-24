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
