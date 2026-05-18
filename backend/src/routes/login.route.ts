import type { FastifyInstance } from "fastify";
import AuthController from "../controllers/login.controller.js";

export async function loginRoutes(fastify: FastifyInstance) {
  const auth = new AuthController();

  // Login e a porta de entrada para gerar o JWT usado nas rotas protegidas.
  fastify.post("/login", auth.login);
}
