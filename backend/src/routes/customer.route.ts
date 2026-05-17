import type { FastifyInstance } from "fastify";
import CustomerController from "../controllers/customer.controller.js";

export async function customerRoutes(fastify: FastifyInstance) {
  const customer = new CustomerController();

  fastify.post("/customers", customer.create);
  fastify.get("/customers", customer.listAll);
}
