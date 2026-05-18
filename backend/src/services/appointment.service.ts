import AppointmentRepository from "../repositories/appointment.repository.js";
import ServiceRepository from "../repositories/service.repository.js";
import type {
  IAppointmentAvailabilityQuery,
  IAppointmentAvailabilityResponse,
  IAppointmentCreateData,
  IAppointmentDetail,
  IAppointmentHistoryQuery,
  IAppointmentResponseData,
  IAppointmentUpdateInput,
} from "../types/appointment.type.js";
import type { IAuthenticatedUser } from "../types/auth.type.js";
import type IResponse from "../types/response.type.js";
import type { IService } from "../types/service.type.js";

export default class AppointmentService {
  private readonly slotDurationInMinutes = 30;
  private readonly businessStartHour = 8;
  private readonly businessEndHour = 18;
  private appointmentRepository = new AppointmentRepository();
  private serviceRepository = new ServiceRepository();

  availability = async (
    query: IAppointmentAvailabilityQuery,
  ): Promise<IResponse<IAppointmentAvailabilityResponse>> => {
    try {
      const services = await this.serviceRepository.findByIds(query.serviceIds);

      if (services.length !== new Set(query.serviceIds).size) {
        return this.badRequestResponse(
          "serviceIds",
          "Um ou mais servicos informados nao existem.",
        );
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);
      const slots = this.generateSlots(query.date);

      // Busca agendamentos do dia de forma otimizada para a checagem
      const appointments = await this.getAppointmentsByDay(
        new Date(query.date),
      );
      const availableSlots = [];

      for (const slotStart of slots) {
        const slotEnd = new Date(
          slotStart.getTime() + requiredDurationInMinutes * 60000,
        );
        const businessLimit = new Date(query.date);
        businessLimit.setHours(this.businessEndHour, 0, 0, 0);

        if (slotEnd > businessLimit) {
          continue;
        }

        if (this.hasConflict(slotStart, slotEnd, appointments)) {
          continue;
        }

        availableSlots.push({
          startTime: slotStart.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          endTime: slotEnd.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          startDateTime: slotStart.toISOString(),
          endDateTime: slotEnd.toISOString(),
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
    data: IAppointmentCreateData,
  ): Promise<IResponse> => {
    try {
      // Ajuste de Segurança: impede que cliente comum agende no ID de terceiros
      const customerId = user.role === "ADMIN" ? data.customerId : user.id;

      const services = await this.serviceRepository.findByIds(data.serviceIds);
      if (services.length !== new Set(data.serviceIds).size) {
        return this.badRequestResponse(
          "serviceIds",
          "Um ou mais servicos informados nao existem.",
        );
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);
      const startDate = new Date(data.startDate);
      const endDate = new Date(
        startDate.getTime() + requiredDurationInMinutes * 60000,
      );

      // Validação Centralizada de Horário Comercial
      if (!this.isWithinBusinessHours(startDate, endDate)) {
        return {
          status: 400,
          success: false,
          message: "Horario fora dos limites do expediente.",
        };
      }

      // Validação Centralizada de Conflitos na Agenda
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

      const appointment = await this.appointmentRepository.create({
        ...data,
        customerId,
        startDate,
        endDate,
      });

      return {
        status: 201,
        success: true,
        message: "Agendamento criado com sucesso.",
        data: appointment,
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

      if (
        user.role !== "ADMIN" &&
        !this.canChangeAppointment(appointment.startDate)
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
      const startDate = new Date(data.startDate);
      const endDate = new Date(
        startDate.getTime() + requiredDurationInMinutes * 60000,
      );

      // Validação Centralizada de Horário Comercial
      if (!this.isWithinBusinessHours(startDate, endDate)) {
        return {
          status: 400,
          success: false,
          message: "Horario fora dos limites do expediente.",
        };
      }

      // Validação Centralizada de Conflitos (passando o ID atual para ignorá-lo na busca)
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

      return {
        status: 200,
        success: true,
        message: "Agendamento atualizado com sucesso.",
        data: { appointment: detail },
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
        data: appointment,
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
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);

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
        data: appointments,
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
  // Métodos Auxiliares e Regras de Negócio
  // ==========================================

  private calculateTotalServicesDurationInMinutes = (
    services: IService[],
  ): number => {
    return services.reduce(
      (total, service) => total + service.estimatedTimeInMinutes,
      0,
    );
  };

  private generateSlots(date: string): Date[] {
    const slots: Date[] = [];
    const baseDate = new Date(date);
    baseDate.setHours(this.businessStartHour, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(this.businessEndHour, 0, 0, 0);

    while (baseDate < endDate) {
      slots.push(new Date(baseDate));
      baseDate.setMinutes(baseDate.getMinutes() + this.slotDurationInMinutes);
    }
    return slots;
  }

  private hasConflict(
    slotStart: Date,
    slotEnd: Date,
    appointments: IAppointmentDetail[],
  ): boolean {
    return appointments.some((appointment) => {
      return (
        slotStart < new Date(appointment.endDate) &&
        slotEnd > new Date(appointment.startDate)
      );
    });
  }

  private isWithinBusinessHours(start: Date, end: Date): boolean {
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
    const dayStart = new Date(date).setHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setHours(23, 59, 59, 999);
    return this.appointmentRepository.findByDay(
      new Date(dayStart),
      new Date(dayEnd),
      excludeAppointmentId,
    );
  }

  private async validateScheduleConflict(
    start: Date,
    end: Date,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
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

  private canChangeAppointment(date: Date): boolean {
    const diffInMs = new Date(date).getTime() - new Date().getTime();
    const twoDaysInMs = 1000 * 60 * 60 * 24 * 2;
    return diffInMs >= twoDaysInMs;
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
}
