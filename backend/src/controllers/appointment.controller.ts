import type { FastifyReply, FastifyRequest } from "fastify";
import AppointmentService from "../services/appointment.service.js";
import type {
  IAppointmentAvailabilityQueryInput,
  IAppointmentCreateData,
  IAppointmentHistoryQuery,
  IAppointmentStatusUpdateInput,
  IAppointmentUpdateInput,
} from "../types/appointment.type.js";

export default class AppointmentController {
  private appointmentService = new AppointmentService();

  availability = async (request: FastifyRequest, reply: FastifyReply) => {
    // A query pode vir repetida ou em CSV; aqui normalizamos para number[].
    const query = request.query as IAppointmentAvailabilityQueryInput;
    const serviceIds = this.parseServiceIds(query.serviceIds);

    const response = await this.appointmentService.availability({
      date: query.date ?? "",
      serviceIds,
    });

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    // A criacao usa o usuario autenticado para decidir quem sera o dono do agendamento.
    const data = request.body as IAppointmentCreateData;

    const response = await this.appointmentService.create(request.user, data);

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const data = request.body as IAppointmentUpdateInput;

    const response = await this.appointmentService.update(
      request.user,
      Number(params.id),
      data,
    );

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };

  updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const data = request.body as IAppointmentStatusUpdateInput;

    const response = await this.appointmentService.updateStatus(
      Number(params.id),
      data,
    );

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };

  detail = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };

    const response = await this.appointmentService.detail(
      Number(params.id),
      request.user,
    );

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };

  history = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as IAppointmentHistoryQuery;

    const response = await this.appointmentService.history(request.user, query);

    return reply.status(response.status).send({
      success: response.success,
      message: response.message,
      data: response.data,
      error: response.error,
    });
  };

  private parseServiceIds(serviceIds?: string | string[]): number[] {
    if (!serviceIds) {
      return [];
    }

    // A rota aceita ?serviceIds=1,2 ou ?serviceIds=1&serviceIds=2.
    const rawValues = Array.isArray(serviceIds) ? serviceIds : [serviceIds];

    return rawValues
      .flatMap((value) => value.split(","))
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value));
  }
}
