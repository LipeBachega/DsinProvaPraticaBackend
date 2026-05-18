import type { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import AppointmentController from "../controllers/appointment.controller.js";

export async function appointmentRoutes(fastify: FastifyInstance) {
  const appointment = new AppointmentController();

  // Toda a agenda exige autenticacao; apenas mudanca de status exige perfil admin.
  fastify.get(
    "/appointments/availability",
    { preHandler: authMiddleware },
    appointment.availability,
  );
  fastify.post(
    "/appointments",
    { preHandler: authMiddleware },
    appointment.create,
  );
  fastify.get(
    "/appointments/history",
    { preHandler: authMiddleware },
    appointment.history,
  );
  fastify.get(
    "/appointments/:id",
    { preHandler: authMiddleware },
    appointment.detail,
  );
  fastify.put(
    "/appointments/:id",
    { preHandler: authMiddleware },
    appointment.update,
  );
  fastify.patch(
    "/appointments/:id/status",
    { preHandler: [authMiddleware, adminMiddleware] },
    appointment.updateStatus,
  );
}
