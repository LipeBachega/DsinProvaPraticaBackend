import type { FastifyReply, FastifyRequest } from "fastify";
import ServiceService from "../services/service.service.js";

export default class ServiceController {
  private serviceService = new ServiceService();

  listAll = async (_request: FastifyRequest, reply: FastifyReply) => {
    // Controller simples: apenas repassa a resposta padronizada da camada de service.
    const response = await this.serviceService.listAll();

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };
}
