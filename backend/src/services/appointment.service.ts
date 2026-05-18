import AppointmentRepository from "../repositories/appointment.repository.js";
import CustomerRepository from "../repositories/customer.repository.js";
import ServiceRepository from "../repositories/service.repository.js";
import type {
  IAppointmentAvailabilityQuery,
  IAppointmentAvailabilityResponse,
  IAppointmentCreateData,
  IAppointmentCreateInput,
  IAppointmentDetail,
  IAppointmentHistoryQuery,
  IAppointmentResponseData,
  IAppointmentSuggestion,
  IAppointmentStatusUpdateInput,
  IAppointmentUpdateInput,
} from "../types/appointment.type.js";
import type { IAuthenticatedUser } from "../types/auth.type.js";
import type IResponse from "../types/response.type.js";
import type { IService } from "../types/service.type.js";
import AppointmentValidator from "../validators/appointment.validator.js";
import {
  formatBrazilDateTime,
  formatBrazilTime,
  getBrazilDayRange,
  getBrazilWeekRange,
  isSameBrazilCalendarDay,
  parseBrazilDate,
  parseBrazilDateTime,
} from "../utils/datetime.lib.js";

export default class AppointmentService {
  // O sistema sugere horarios de 30 em 30 minutos dentro do expediente.
  private readonly slotDurationInMinutes = 30;
  private readonly businessStartHour = 8;
  private readonly businessEndHour = 18;
  private appointmentRepository = new AppointmentRepository();
  private customerRepository = new CustomerRepository();
  private serviceRepository = new ServiceRepository();
  private validation = new AppointmentValidator();

  availability = async (
    query: IAppointmentAvailabilityQuery,
  ): Promise<IResponse<IAppointmentAvailabilityResponse>> => {
    try {
      const validation = this.validation.availabilityValidator(query);
      if (!validation.isValid) {
        return this.validationErrorResponse(validation.fields ?? []);
      }

      // A consulta por dia nasce em Brasilia porque a agenda do salao e local, nao em UTC.
      const requestedDate = parseBrazilDate(query.date);

      // Busca os servicos para descobrir a duracao total do atendimento.
      const services = await this.serviceRepository.findByIds(query.serviceIds);

      if (services.length !== new Set(query.serviceIds).size) {
        return this.badRequestResponse(
          "serviceIds",
          "Um ou mais servicos informados nao existem.",
        );
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);
      const slots = this.generateSlots(requestedDate);

      // Com os agendamentos do dia em maos, filtramos apenas os horarios livres.
      const appointments = await this.getAppointmentsByDay(requestedDate);
      const availableSlots = [];

      for (const slotStart of slots) {
        // Cada horario sugerido ganha a duracao total dos servicos escolhidos.
        const slotEnd = new Date(
          slotStart.getTime() + requiredDurationInMinutes * 60000,
        );
        const businessLimit = new Date(requestedDate);
        businessLimit.setHours(this.businessEndHour, 0, 0, 0);

        if (slotEnd > businessLimit) {
          continue;
        }

        if (this.hasConflict(slotStart, slotEnd, appointments)) {
          continue;
        }

        availableSlots.push({
          startTime: formatBrazilTime(slotStart),
          endTime: formatBrazilTime(slotEnd),
          startDateTime: formatBrazilDateTime(slotStart),
          endDateTime: formatBrazilDateTime(slotEnd),
        });
      }

      return {
        status: 200,
        success: true,
        message: "Horarios disponiveis listados com sucesso.",
        data: {
          date: query.date,
          requiredDurationInMinutes,
          availableSlots,
        },
      };
    } catch (error) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor.",
        error,
      };
    }
  };

  create = async (
    user: IAuthenticatedUser,
    data: IAppointmentCreateInput | IAppointmentCreateData,
  ): Promise<IResponse<IAppointmentResponseData>> => {
    try {
      const validation = this.validation.createValidator(data);
      if (!validation.isValid) {
        return this.validationErrorResponse(validation.fields ?? []);
      }

      // Cliente comum agenda apenas para si; admin pode informar outro cliente manualmente.
      const customerId =
        user.role === "ADMIN" ? Number((data as any).customerId) : user.id;

      if (user.role === "ADMIN") {
        // Quando o admin agenda em nome de outra pessoa, garantimos que o cliente exista.
        const customerExists = await this.customerRepository.findById(customerId);

        if (!customerExists) {
          return this.badRequestResponse(
            "customerId",
            "O cliente informado nao existe.",
          );
        }
      }

      const services = await this.serviceRepository.findByIds(data.serviceIds);
      if (services.length !== new Set(data.serviceIds).size) {
        return this.badRequestResponse(
          "serviceIds",
          "Um ou mais servicos informados nao existem.",
        );
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);
      // O payload pode vir com offset explicito; aqui normalizamos tudo para um Date consistente.
      const startDate = parseBrazilDateTime(data.startDate);
      const endDate = new Date(
        startDate.getTime() + requiredDurationInMinutes * 60000,
      );

      if (!this.isWithinBusinessHours(startDate, endDate)) {
        return {
          status: 400,
          success: false,
          message: "Horario fora dos limites do expediente.",
        };
      }

      const hasConflict = await this.validateScheduleConflict(
        startDate,
        endDate,
      );
      if (hasConflict) {
        return {
          status: 400,
          success: false,
          message: "Ja existe um agendamento nesse horario.",
        };
      }

      const appointmentData: IAppointmentCreateData = {
        customerId,
        startDate,
        endDate,
        serviceIds: data.serviceIds,
      };

      const appointment = await this.appointmentRepository.create(
        appointmentData,
      );

      const detail = await this.appointmentRepository.findById(appointment.id);
      if (!detail) {
        return {
          status: 500,
          success: false,
          message: "Erro interno no servidor ao buscar o agendamento criado.",
        };
      }

      // Se ja existe outro agendamento da cliente na mesma semana, apenas sugerimos.
      const suggestion = await this.buildSameWeekSuggestion(
        customerId,
        startDate,
        appointment.id,
      );

      return {
        status: 201,
        success: true,
        message: "Agendamento criado com sucesso.",
        data: suggestion
          ? {
              appointment: this.serializeAppointmentDetail(detail),
              suggestion: this.serializeSuggestion(suggestion),
            }
          : {
              appointment: this.serializeAppointmentDetail(detail),
            },
      };
    } catch (error) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor.",
        error,
      };
    }
  };

  update = async (
    user: IAuthenticatedUser,
    appointmentId: number,
    data: IAppointmentUpdateInput,
  ): Promise<IResponse<IAppointmentResponseData>> => {
    try {
      const validation = this.validation.updateValidator(data);
      if (!validation.isValid) {
        return this.validationErrorResponse(validation.fields ?? []);
      }

      const appointment =
        await this.appointmentRepository.findModelById(appointmentId);

      if (!appointment) {
        return {
          status: 404,
          success: false,
          message: "Agendamento nao encontrado.",
        };
      }

      if (!this.canAccessAppointment(user, appointment.customerId)) {
        return { status: 403, success: false, message: "Acesso negado." };
      }

      // A Leila (ADMIN) pode ajustar por telefone mesmo quando faltam menos de 2 dias.
      // Clientes comuns so podem alterar pelo sistema se ainda restarem pelo menos 48 horas.
      // Pela regra do desafio, a verificacao olha para a data original do agendamento.
      if (
        !this.canUpdateAppointmentThroughSystem(user, appointment.startDate)
      ) {
        return {
          status: 400,
          success: false,
          message:
            "O agendamento so pode ser alterado pelo sistema ate 2 dias antes da data marcada.",
        };
      }

      const services = await this.serviceRepository.findByIds(data.serviceIds);
      if (services.length !== new Set(data.serviceIds).size) {
        return this.badRequestResponse(
          "serviceIds",
          "Um ou mais servicos informados nao existem.",
        );
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);
      const startDate = parseBrazilDateTime(data.startDate);
      const endDate = new Date(
        startDate.getTime() + requiredDurationInMinutes * 60000,
      );

      if (!this.isWithinBusinessHours(startDate, endDate)) {
        return {
          status: 400,
          success: false,
          message: "Horario fora dos limites do expediente.",
        };
      }

      const hasConflict = await this.validateScheduleConflict(
        startDate,
        endDate,
        appointment.id,
      );
      if (hasConflict) {
        return {
          status: 400,
          success: false,
          message: "Ja existe um agendamento nesse horario.",
        };
      }

      await this.appointmentRepository.update(appointment, {
        startDate,
        endDate,
        serviceIds: data.serviceIds,
      });

      const detail = await this.appointmentRepository.findById(appointmentId);
      if (!detail) {
        return {
          status: 500,
          success: false,
          message: "Erro interno no servidor ao atualizar agendamento.",
        };
      }

      // Na alteracao, a resposta pode trazer a mesma sugestao informativa.
      const suggestion = await this.buildSameWeekSuggestion(
        appointment.customerId,
        startDate,
        appointment.id,
      );

      return {
        status: 200,
        success: true,
        message: "Agendamento atualizado com sucesso.",
        data: suggestion
          ? {
              appointment: this.serializeAppointmentDetail(detail),
              suggestion: this.serializeSuggestion(suggestion),
            }
          : { appointment: this.serializeAppointmentDetail(detail) },
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor ao atualizar agendamento.",
        error: error.message,
      };
    }
  };

  updateStatus = async (
    appointmentId: number,
    data: IAppointmentStatusUpdateInput,
  ): Promise<IResponse<IAppointmentResponseData>> => {
    try {
      const appointment =
        await this.appointmentRepository.findModelById(appointmentId);

      if (!appointment) {
        return {
          status: 404,
          success: false,
          message: "Agendamento nao encontrado.",
        };
      }

      // A Leila so pode usar os status previstos pela regra de negocio.
      if (!this.isAllowedStatus(data.status)) {
        return this.badRequestResponse(
          "status",
          "Status invalido para o agendamento.",
        );
      }

      await this.appointmentRepository.updateStatus(appointment, data.status);

      const detail = await this.appointmentRepository.findById(appointmentId);
      if (!detail) {
        return {
          status: 500,
          success: false,
          message: "Erro interno no servidor ao atualizar status do agendamento.",
        };
      }

      return {
        status: 200,
        success: true,
        message: "Status do agendamento atualizado com sucesso.",
        data: { appointment: this.serializeAppointmentDetail(detail) },
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor ao atualizar status do agendamento.",
        error: error.message,
      };
    }
  };

  detail = async (
    appointmentId: number,
    user: IAuthenticatedUser,
  ): Promise<IResponse<IAppointmentDetail>> => {
    try {
      const appointment =
        await this.appointmentRepository.findById(appointmentId);

      if (!appointment) {
        return {
          status: 404,
          success: false,
          message: "Agendamento nao encontrado.",
        };
      }

      if (appointment.customerId !== user.id && user.role !== "ADMIN") {
        return {
          status: 403,
          success: false,
          message: "Voce nao possui permissao para acessar este agendamento.",
        };
      }

      return {
        status: 200,
        success: true,
        message: "Agendamento encontrado com sucesso.",
        data: this.serializeAppointmentDetail(appointment),
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor ao buscar agendamento.",
        error: error.message,
      };
    }
  };

  history = async (
    user: IAuthenticatedUser,
    query: IAppointmentHistoryQuery,
  ): Promise<IResponse<IAppointmentDetail[]>> => {
    try {
      const validation = this.validation.historyValidator(query);
      if (!validation.isValid) {
        return this.validationErrorResponse(validation.fields ?? []);
      }

      const { start: startDate } = getBrazilDayRange(
        parseBrazilDate(query.startDate),
      );
      const { end: endDate } = getBrazilDayRange(parseBrazilDate(query.endDate));

      const appointments =
        await this.appointmentRepository.findByCustomerAndPeriod(
          user.id,
          startDate,
          endDate,
        );

      return {
        status: 200,
        success: true,
        message: "Historico de agendamentos listado com sucesso.",
        data: appointments.map((appointment) =>
          this.serializeAppointmentDetail(appointment),
        ),
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message:
          "Erro interno no servidor ao listar historico de agendamentos.",
        error: error.message,
      };
    }
  };

  // ==========================================
  // Metodos Auxiliares e Regras de Negocio
  // ==========================================

  private calculateTotalServicesDurationInMinutes = (
    services: IService[],
  ): number => {
    // Soma a duracao de todos os servicos escolhidos no mesmo horario.
    return services.reduce(
      (total, service) => total + service.estimatedTimeInMinutes,
      0,
    );
  };

  private generateSlots(date: Date): Date[] {
    const slots: Date[] = [];
    const baseDate = new Date(date);
    baseDate.setHours(this.businessStartHour, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(this.businessEndHour, 0, 0, 0);

    while (baseDate < endDate) {
      // Precisamos clonar a data atual antes de avancar o ponteiro do loop.
      slots.push(new Date(baseDate));
      // A agenda avanca em blocos fixos de 30 minutos.
      baseDate.setMinutes(baseDate.getMinutes() + this.slotDurationInMinutes);
    }
    return slots;
  }

  private hasConflict(
    slotStart: Date,
    slotEnd: Date,
    appointments: IAppointmentDetail[],
  ): boolean {
    // Existe conflito quando o novo intervalo se sobrepoe a outro ja salvo.
    return appointments.some((appointment) => {
      return (
        slotStart < new Date(appointment.endDate) &&
        slotEnd > new Date(appointment.startDate)
      );
    });
  }

  private isWithinBusinessHours(start: Date, end: Date): boolean {
    // O atendimento precisa comecar depois da abertura e terminar antes do fechamento.
    const businessStart = new Date(start).setHours(
      this.businessStartHour,
      0,
      0,
      0,
    );
    const businessEnd = new Date(start).setHours(this.businessEndHour, 0, 0, 0);
    return start.getTime() >= businessStart && end.getTime() <= businessEnd;
  }

  private async getAppointmentsByDay(
    date: Date,
    excludeAppointmentId?: number,
  ): Promise<IAppointmentDetail[]> {
    // O recorte diario usa as fronteiras de Brasilia para casar com a visao do usuario.
    const { start, end } = getBrazilDayRange(date);
    return this.appointmentRepository.findByDay(
      start,
      end,
      excludeAppointmentId,
    );
  }

  private async validateScheduleConflict(
    start: Date,
    end: Date,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
    // No update ignoramos o proprio registro para nao gerar falso positivo.
    const appointments = await this.getAppointmentsByDay(
      start,
      excludeAppointmentId,
    );
    return this.hasConflict(start, end, appointments);
  }

  private canAccessAppointment(
    user: IAuthenticatedUser,
    customerId: number,
  ): boolean {
    return user.role === "ADMIN" || user.id === customerId;
  }

  private canUpdateAppointmentThroughSystem(
    user: IAuthenticatedUser,
    appointmentDate: Date,
  ): boolean {
    if (user.role === "ADMIN") {
      return true;
    }

    return this.canChangeAppointment(appointmentDate);
  }

  private canChangeAppointment(date: Date): boolean {
    // A regra de negocio considera 2 dias como uma janela minima de 48 horas.
    const diffInMs = new Date(date).getTime() - new Date().getTime();
    const twoDaysInMs = 1000 * 60 * 60 * 24 * 2;
    return diffInMs >= twoDaysInMs;
  }

  private async buildSameWeekSuggestion(
    customerId: number,
    appointmentDate: Date,
    excludeAppointmentId?: number,
  ): Promise<IAppointmentSuggestion | undefined> {
    const { weekStart, weekEnd } = this.getWeekRange(appointmentDate);
    const firstAppointment = await this.appointmentRepository.findFirstInWeek(
      customerId,
      weekStart,
      weekEnd,
      excludeAppointmentId,
    );

    if (!firstAppointment) {
      return undefined;
    }

    if (this.isSameCalendarDay(firstAppointment.startDate, appointmentDate)) {
      return undefined;
    }

    return {
      appointmentId: firstAppointment.id,
      startDate: firstAppointment.startDate,
      endDate: firstAppointment.endDate,
      message:
        "Voce ja possui um agendamento nesta semana. Considere concentrar os servicos na data do primeiro agendamento.",
    };
  }

  private isAllowedStatus(status: string): boolean {
    return ["CONFIRMADO", "CONCLUIDO", "CANCELADO"].includes(status);
  }

  private getWeekRange(date: Date): { weekStart: Date; weekEnd: Date } {
    const { start, end } = getBrazilWeekRange(date);

    return {
      weekStart: start,
      weekEnd: end,
    };
  }

  private isSameCalendarDay(
    dateA: Date | string,
    dateB: Date | string,
  ): boolean {
    return isSameBrazilCalendarDay(dateA, dateB);
  }

  private badRequestResponse<T = unknown>(
    field: string,
    error: string,
  ): IResponse<T> {
    return {
      status: 400,
      success: false,
      message: "Os dados fornecidos nao sao validos.",
      error: [{ field, error }],
    };
  }

  private validationErrorResponse<T = unknown>(
    fields: { field: string; error: string }[],
  ): IResponse<T> {
    return {
      status: 400,
      success: false,
      message: "Os dados fornecidos nao sao validos.",
      error: fields,
    };
  }

  private serializeAppointmentDetail(
    appointment: IAppointmentDetail,
  ): IAppointmentDetail {
    // A API responde em horario de Brasilia para evitar que o front tenha de "adivinhar" o fuso.
    const serializedAppointment = this.serializeTimestampFields({
      ...appointment,
      startDate: formatBrazilDateTime(appointment.startDate),
      endDate: formatBrazilDateTime(appointment.endDate),
    });

    if (Array.isArray(serializedAppointment.services)) {
      serializedAppointment.services = serializedAppointment.services.map(
        (service) => this.serializeTimestampFields(service),
      );
    }

    return serializedAppointment as IAppointmentDetail;
  }

  private serializeSuggestion(
    suggestion: IAppointmentSuggestion,
  ): IAppointmentSuggestion {
    return {
      ...suggestion,
      startDate: formatBrazilDateTime(suggestion.startDate),
      endDate: formatBrazilDateTime(suggestion.endDate),
    };
  }

  private serializeTimestampFields<T>(data: T): T {
    const serializedData = {
      ...(data as Record<string, any>),
    };

    if (serializedData.createdAt) {
      serializedData.createdAt = formatBrazilDateTime(serializedData.createdAt);
    }

    if (serializedData.updatedAt) {
      serializedData.updatedAt = formatBrazilDateTime(serializedData.updatedAt);
    }

    return serializedData as T;
  }
}
