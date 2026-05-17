import type { FastifyInstance } from "fastify";
import AuthController from "../controllers/login.controller.js";

export async function loginRoutes(fastify: FastifyInstance) {
  const auth = new AuthController();

  fastify.post("/login", auth.login);
}
