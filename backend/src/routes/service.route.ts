import type { FastifyInstance } from "fastify";
import ServiceController from "../controllers/service.controller.js";

export async function serviceRoutes(fastify: FastifyInstance) {
  const service = new ServiceController();

  // Servicos ficam publicos para o cliente consultar opcoes antes do agendamento.
  fastify.get("/services", service.listAll);
}
