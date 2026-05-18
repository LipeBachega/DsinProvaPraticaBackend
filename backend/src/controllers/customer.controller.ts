import { type FastifyReply, type FastifyRequest } from "fastify";
import type { ICustomerCreate } from "../types/customer.type.js";
import CustomerService from "../services/customer.service.js";

export default class CustomerController {
  private customerService = new CustomerService();

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    // O controller traduz a entrada HTTP para o formato esperado pelo service.
    const customer = request.body as ICustomerCreate;

    const response = await this.customerService.create(customer);

    reply.status(response.status).send({
      message: response.message,
      success: response.success,
      data: response.data,
      error: response.error,
    });
  };
  listAll = async (request: FastifyRequest, reply: FastifyReply) => {
    // Esta rota ainda esta como placeholder; a listagem real nao foi implementada.
    reply.send("List All");
  };
}
