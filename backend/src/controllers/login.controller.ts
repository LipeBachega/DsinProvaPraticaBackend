import type { FastifyReply, FastifyRequest } from "fastify";

import type { ILogin } from "../types/auth.type.js";
import AuthService from "../services/auth.service.js";

export default class AuthController {
  private authService = new AuthService();

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    // O login delega a validacao de credenciais ao service e devolve o token gerado.
    const data = request.body as ILogin;

    const response = await this.authService.login(data);

    return reply.status(response.status).send({
      success: response.success,

      message: response.message,

      data: response.data,

      error: response.error,
    });
  };
}
