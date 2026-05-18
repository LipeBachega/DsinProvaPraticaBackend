import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Esta checagem e usada quando a regra de negocio exige privilegio administrativo.
  if (
    request.user.role !== "ADMIN"
  ) {

    return reply.status(403).send({
      success: false,
      message: "Acesso negado.",
    });
  }
}
