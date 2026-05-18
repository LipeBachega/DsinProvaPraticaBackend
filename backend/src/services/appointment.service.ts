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
        return {
          status: 400,

          success: false,

          message: "Os dados fornecidos nao sao validos.",

          error: [
            {
              field: "serviceIds",

              error: "Um ou mais servicos informados nao existem.",
            },
          ],
        };
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);

      const dayStart = new Date(query.date);

      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(query.date);

      dayEnd.setHours(23, 59, 59, 999);

      const appointments = await this.appointmentRepository.findByDay(
        dayStart,
        dayEnd,
      );

      const slots = this.generateSlots(query.date);

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

        const conflict = this.hasConflict(slotStart, slotEnd, appointments);

        if (conflict) {
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

  create = async (data: IAppointmentCreateData): Promise<IResponse> => {
    try {
      const services = await this.serviceRepository.findByIds(data.serviceIds);
      if (services.length !== new Set(data.serviceIds).size) {
        return {
          status: 400,
          success: false,
          message: "Os dados fornecidos nao sao validos.",
          error: [
            {
              field: "serviceIds",
              error: "Um ou mais servicos informados nao existem.",
            },
          ],
        };
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);

      const endDate = new Date(
        data.startDate.getTime() + requiredDurationInMinutes * 60000,
      );

      const businessStart = new Date(data.startDate);

      businessStart.setHours(this.businessStartHour, 0, 0, 0);

      const businessEnd = new Date(data.startDate);

      businessEnd.setHours(this.businessEndHour, 0, 0, 0);

      if (data.startDate < businessStart) {
        return {
          status: 400,
          success: false,
          message: "Horario fora do expediente.",
        };
      }

      if (endDate > businessEnd) {
        return {
          status: 400,
          success: false,
          message: "Horario excede o expediente.",
        };
      }

      const dayStart = new Date(data.startDate);

      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(data.startDate);

      dayEnd.setHours(23, 59, 59, 999);

      const appointments = await this.appointmentRepository.findByDay(
        dayStart,
        dayEnd,
      );

      const conflict = this.hasConflict(data.startDate, endDate, appointments);

      if (conflict) {
        return {
          status: 400,
          success: false,
          message: "Ja existe um agendamento nesse horario.",
        };
      }

      const appointment = await this.appointmentRepository.create({
        ...data,
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
        return {
          status: 403,
          success: false,
          message: "Acesso negado.",
        };
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
        return {
          status: 400,
          success: false,
          message: "Os dados fornecidos nao sao validos.",
          error: [
            {
              field: "serviceIds",
              error: "Um ou mais servicos informados nao existem.",
            },
          ],
        };
      }

      const requiredDurationInMinutes =
        this.calculateTotalServicesDurationInMinutes(services);

      const startDate = new Date(data.startDate);

      const endDate = new Date(
        startDate.getTime() + requiredDurationInMinutes * 60000,
      );

      const businessStart = new Date(startDate);

      businessStart.setHours(this.businessStartHour, 0, 0, 0);

      const businessEnd = new Date(startDate);

      businessEnd.setHours(this.businessEndHour, 0, 0, 0);

      if (startDate < businessStart) {
        return {
          status: 400,
          success: false,
          message: "Horario fora do expediente.",
        };
      }

      if (endDate > businessEnd) {
        return {
          status: 400,
          success: false,
          message: "Horario excede o expediente.",
        };
      }

      const dayStart = new Date(startDate);

      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(startDate);

      dayEnd.setHours(23, 59, 59, 999);

      const appointments = await this.appointmentRepository.findByDay(
        dayStart,
        dayEnd,
        appointment.id,
      );

      const conflict = this.hasConflict(startDate, endDate, appointments);

      if (conflict) {
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
        data: {
          appointment: detail,
        },
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

  // Metodos auxiliares
  private calculateTotalServicesDurationInMinutes = (
    services: IService[],
  ): number => {
    return services.reduce((total, service) => {
      return total + service.estimatedTimeInMinutes;
    }, 0);
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
}
