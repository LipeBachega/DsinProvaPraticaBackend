import type { FastifyReply, FastifyRequest } from "fastify";

import { verifyToken } from "../utils/jwt.lib.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // O middleware autentica uma vez e injeta o usuario logado em request.user.
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        message: "Token não informado.",
      });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return reply.status(401).send({
        success: false,
        message: "Token inválido.",
      });
    }

    const decoded = verifyToken(token);

    request.user = decoded;
  } catch {
    return reply.status(401).send({
      success: false,
      message: "Token inválido.",
    });
  }
}
