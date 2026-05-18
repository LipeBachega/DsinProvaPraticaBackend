import type { FastifyInstance } from "fastify";
import CustomerController from "../controllers/customer.controller.js";

export async function customerRoutes(fastify: FastifyInstance) {
  // A camada de rotas apenas conecta URL + verbo HTTP ao controller correspondente.
  const customer = new CustomerController();

  fastify.post("/customers", customer.create);
  fastify.get("/customers", customer.listAll);
}
