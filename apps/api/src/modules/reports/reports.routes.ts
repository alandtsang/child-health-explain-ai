import type { FastifyInstance, FastifyReply } from "fastify";
import { z, ZodError } from "zod";

import type { MemoryStore } from "../../db/client.js";
import { approveDoctorReview, createReportDraft, ReportNotFoundError } from "./reports.service.js";

const IdParamsSchema = z.object({
  id: z.string().min(1)
});

const DoctorReviewBodySchema = z.object({
  doctorId: z.string().min(1),
  editedContent: z.unknown()
});

function notFoundMessage(error: ReportNotFoundError): string {
  if (error.code === "draft_not_found") return "Report draft not found";
  if (error.code === "rule_evaluations_not_found") return "Rule evaluations not found";

  return "Checkup not found";
}

function sendValidationError(reply: FastifyReply, error: ZodError) {
  return reply.code(400).send({
    error: "validation_error",
    message: error.message,
    issues: error.issues
  });
}

export async function registerReportRoutes(app: FastifyInstance, store: MemoryStore) {
  app.post("/checkups/:id/report-drafts", async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    try {
      const draft = createReportDraft(store, params.data.id);

      return reply.code(201).send(draft);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        return reply.code(404).send({
          error: "not_found",
          message: notFoundMessage(error)
        });
      }

      throw error;
    }
  });

  app.post("/report-drafts/:id/doctor-review", async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return sendValidationError(reply, params.error);
    }

    const draft = store.aiDrafts.find((item) => item.id === params.data.id);

    if (!draft) {
      return reply.code(404).send({
        error: "not_found",
        message: "Report draft not found"
      });
    }

    const body = DoctorReviewBodySchema.safeParse(request.body);

    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    try {
      const review = approveDoctorReview(store, draft.id, body.data.doctorId, body.data.editedContent);

      return reply.code(201).send(review);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendValidationError(reply, error);
      }

      throw error;
    }
  });
}
