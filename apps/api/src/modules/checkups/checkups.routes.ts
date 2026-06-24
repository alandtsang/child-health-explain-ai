import type { FastifyInstance } from "fastify";
import { z, ZodError } from "zod";

import type { MemoryStore } from "../../db/client.js";
import { createCheckup } from "./checkups.service.js";

const CheckupParamsSchema = z.object({
  id: z.string().min(1)
});

export async function registerCheckupRoutes(app: FastifyInstance, store: MemoryStore) {
  app.post("/checkups", async (request, reply) => {
    try {
      const result = createCheckup(store, request.body);

      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: "validation_error",
          issues: error.issues
        });
      }

      throw error;
    }
  });

  app.get("/checkups/:id", async (request, reply) => {
    const params = CheckupParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({
        error: "validation_error",
        issues: params.error.issues
      });
    }

    const checkup = store.checkups.find((item) => item.id === params.data.id);

    if (!checkup) {
      return reply.code(404).send({
        error: "not_found"
      });
    }

    return checkup;
  });
}
