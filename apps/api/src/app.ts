import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";

import { createMemoryStore, type MemoryStore } from "./db/client.js";
import { registerCheckupRoutes } from "./modules/checkups/checkups.routes.js";

export async function buildApp(store: MemoryStore = createMemoryStore()) {
  const app = Fastify({ logger: true });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_error",
        message: error.message,
        issues: error.issues
      });
    }

    if (error.statusCode === 400) {
      return reply.code(400).send({
        error: "validation_error",
        message: error.message
      });
    }

    throw error;
  });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "child-health-api"
  }));

  await registerCheckupRoutes(app, store);

  return app;
}
