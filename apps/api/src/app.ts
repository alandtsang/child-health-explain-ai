import cors from "@fastify/cors";
import Fastify from "fastify";

import { createMemoryStore, type MemoryStore } from "./db/client.js";
import { registerCheckupRoutes } from "./modules/checkups/checkups.routes.js";

export async function buildApp(store: MemoryStore = createMemoryStore()) {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "child-health-api"
  }));

  await registerCheckupRoutes(app, store);

  return app;
}
