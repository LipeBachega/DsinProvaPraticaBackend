import { type FastifyReply, type FastifyRequest } from "fastify";
import type { ICustomerCreate } from "../types/customer.type.js";
import CustomerService from "../services/customer.service.js";

export default class CustomerController {
  private customerService = new CustomerService();

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customer = request.body as ICustomerCreate;

      const response = await this.customerService.create(customer);
      reply.status(201).send(response);
    } catch (err) {
      reply.status(500).send(err);
    }
  };
  listAll = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send("List All");
  };
}
