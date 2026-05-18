import type { FastifyInstance } from "fastify";
import ServiceController from "../controllers/service.controller.js";

export async function serviceRoutes(fastify: FastifyInstance) {
  const service = new ServiceController();

  fastify.get("/services", service.listAll);
}
