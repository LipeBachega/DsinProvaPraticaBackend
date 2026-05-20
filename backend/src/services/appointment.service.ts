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
  IAppointmentStatusUpdateInput,
  IAppointmentUpdateInput,
} from "../types/appointment.type.js";
import type { IAuthenticatedUser } from "../types/auth.type.js";
import type IResponse from "../types/response.type.js";
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
  // Horário comercial fixo para simplificar a lógica e os testes,facil de alterar se necessário.
  private readonly businessStartHour = 8;
  private readonly businessEndHour = 18;
  private readonly slotIntervalInMinutes = 30; // Intervalo entre os slots, atualmente fixado em 30 minutos.

  // Repositories
  private appointmentRepository = new AppointmentRepository();
  private customerRepository = new CustomerRepository();
  private serviceRepository = new ServiceRepository();

  // Validators
  private validation = new AppointmentValidator();

  // 1. DISPONIBILIDADE
  availability = async (
    query: IAppointmentAvailabilityQuery,
  ): Promise<IResponse<IAppointmentAvailabilityResponse>> => {
    try {
      // Validação dos dados
      const validation = this.validation.availabilityValidator(query);
      if (!validation.isValid)
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: validation.fields,
        };

      // Converte a string de data recebida para o fuso local (JS é Fogo)
      //  e buscamos os serviços para validar existência e calcular duração total.
      const requestedDate = parseBrazilDate(query.date);
      const services = await this.serviceRepository.findByIds(query.serviceIds);

      // Verificamos se os serviços existem.
      if (services.length !== new Set(query.serviceIds).size) {
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: [
            { field: "serviceIds", error: "Um ou mais serviços não existem." },
          ],
        };
      }

      // Calculamos a duração total dos serviços escolhidos.
      const duration = services.reduce(
        (total, s) => total + s.estimatedTimeInMinutes,
        0,
      );

      // Geramos os slots baseados na hora inicial e final do expediente.
      const slots = this.generateSlots(requestedDate);

      // Define as fronteiras de início e fim do dia para buscar os agendamentos já existentes.
      const { start, end } = getBrazilDayRange(requestedDate);

      const appointments = await this.appointmentRepository.findByDay(
        start,
        end,
        query.appointmentId,
      );

      // aqui vamos armazenar os slots disponíveis para o dia.
      const availableSlots = [];

      // Limite de horário comercial para evitar agendamentos fora do horário.
      const businessLimit = new Date(requestedDate).setHours(
        this.businessEndHour,
        0,
        0,
        0,
      );

      for (const slotStart of slots) {
        // aqui calculamos o tempo final baseado no slot da vez
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        if (slotEnd.getTime() > businessLimit) continue; // se o slot selecionado terminar depois do horario final ele nao inclui.

        // Verificamos se nesse bloco de tempo tem algum agendamento que conflite
        if (this.hasConflict(slotStart, slotEnd, appointments)) continue;

        // Se nenhum dos checks acima for verdadeiro adicionamos o slot
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
        message: "Horários listados.",
        data: {
          date: query.date,
          requiredDurationInMinutes: duration,
          availableSlots,
        },
      };
    } catch (error) {
      return { status: 500, success: false, message: "Erro interno.", error };
    }
  };

  // 2. CRIAÇÃO
  create = async (
    user: IAuthenticatedUser,
    data: IAppointmentCreateInput | IAppointmentCreateData,
  ): Promise<IResponse<IAppointmentResponseData>> => {
    try {
      const validation = this.validation.createValidator(data);
      if (!validation.isValid)
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: validation.fields,
        };

      const customerId =
        user.role === "ADMIN" ? Number((data as any).customerId) : user.id;
      if (
        user.role === "ADMIN" &&
        !(await this.customerRepository.findById(customerId))
      ) {
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: [{ field: "customerId", error: "Cliente não existe." }],
        };
      }

      const services = await this.serviceRepository.findByIds(data.serviceIds);
      if (services.length !== new Set(data.serviceIds).size) {
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: [{ field: "serviceIds", error: "Serviço não existe." }],
        };
      }

      const duration = services.reduce(
        (total, s) => total + s.estimatedTimeInMinutes,
        0,
      );
      const startDate = parseBrazilDateTime(data.startDate);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      // Validação de horário comercial integrada
      if (
        startDate.getHours() < this.businessStartHour ||
        endDate.getHours() > this.businessEndHour ||
        (endDate.getHours() === this.businessEndHour &&
          endDate.getMinutes() > 0)
      ) {
        return {
          status: 400,
          success: false,
          message: "Horário fora do expediente.",
        };
      }

      // Validação de conflito direta
      const { start, end } = getBrazilDayRange(startDate);
      const dayAppointments = await this.appointmentRepository.findByDay(
        start,
        end,
      );
      if (this.hasConflict(startDate, endDate, dayAppointments)) {
        return {
          status: 400,
          success: false,
          message: "Já existe um agendamento nesse horário.",
        };
      }

      const appointment = await this.appointmentRepository.create({
        customerId,
        startDate,
        endDate,
        serviceIds: data.serviceIds,
      });
      const detail = await this.appointmentRepository.findById(appointment.id);
      const suggestion = await this.buildSameWeekSuggestion(
        customerId,
        startDate,
        appointment.id,
      );

      return {
        status: 201,
        success: true,
        message: "Agendamento criado.",
        data: suggestion
          ? {
              appointment: this.serialize(detail!),
              suggestion: {
                ...suggestion,
                startDate: formatBrazilDateTime(suggestion.startDate),
                endDate: formatBrazilDateTime(suggestion.endDate),
              },
            }
          : { appointment: this.serialize(detail!) },
      };
    } catch (error) {
      return { status: 500, success: false, message: "Erro interno.", error };
    }
  };

  // 3. ATUALIZAÇÃO
  update = async (
    user: IAuthenticatedUser,
    appointmentId: number,
    data: IAppointmentUpdateInput,
  ): Promise<IResponse<IAppointmentResponseData>> => {
    try {
      const validation = this.validation.updateValidator(data);
      if (!validation.isValid)
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: validation.fields,
        };

      const appointment =
        await this.appointmentRepository.findModelById(appointmentId);
      if (!appointment)
        return {
          status: 404,
          success: false,
          message: "Agendamento não encontrado.",
        };

      if (user.role !== "ADMIN" && user.id !== appointment.customerId) {
        return { status: 403, success: false, message: "Acesso negado." };
      }

      // Regra dos 2 dias (48 horas) simplificada aqui dentro
      if (user.role !== "ADMIN") {
        const diffInMs =
          new Date(appointment.startDate).getTime() - new Date().getTime();
        if (diffInMs < 1000 * 60 * 60 * 24 * 2) {
          return {
            status: 400,
            success: false,
            message: "Alterações só são permitidas até 2 dias antes.",
          };
        }
      }

      const services = await this.serviceRepository.findByIds(data.serviceIds);
      const duration = services.reduce(
        (total, s) => total + s.estimatedTimeInMinutes,
        0,
      );
      const startDate = parseBrazilDateTime(data.startDate);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const { start, end } = getBrazilDayRange(startDate);
      const dayAppointments = await this.appointmentRepository.findByDay(
        start,
        end,
        appointment.id,
      );
      if (this.hasConflict(startDate, endDate, dayAppointments)) {
        return {
          status: 400,
          success: false,
          message: "Horário indisponível.",
        };
      }

      await this.appointmentRepository.update(appointment, {
        startDate,
        endDate,
        serviceIds: data.serviceIds,
      });
      const detail = await this.appointmentRepository.findById(appointmentId);
      const suggestion = await this.buildSameWeekSuggestion(
        appointment.customerId,
        startDate,
        appointment.id,
      );

      return {
        status: 200,
        success: true,
        message: "Agendamento atualizado.",
        data: suggestion
          ? {
              appointment: this.serialize(detail!),
              suggestion: {
                ...suggestion,
                startDate: formatBrazilDateTime(suggestion.startDate),
                endDate: formatBrazilDateTime(suggestion.endDate),
              },
            }
          : { appointment: this.serialize(detail!) },
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno.",
        error: error.message,
      };
    }
  };

  // 4. ATUALIZAÇÃO DE STATUS
  updateStatus = async (
    appointmentId: number,
    data: IAppointmentStatusUpdateInput,
  ): Promise<IResponse<IAppointmentResponseData>> => {
    try {
      const appointment =
        await this.appointmentRepository.findModelById(appointmentId);
      if (!appointment)
        return {
          status: 404,
          success: false,
          message: "Agendamento não encontrado.",
        };

      if (
        !["PENDENTE", "CONFIRMADO", "CONCLUIDO", "CANCELADO"].includes(
          data.status,
        )
      ) {
        return { status: 400, success: false, message: "Status inválido." };
      }

      await this.appointmentRepository.updateStatus(appointment, data.status);
      const detail = await this.appointmentRepository.findById(appointmentId);
      return {
        status: 200,
        success: true,
        message: "Status atualizado.",
        data: { appointment: this.serialize(detail!) },
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno.",
        error: error.message,
      };
    }
  };

  // 5. DETALHES
  detail = async (
    appointmentId: number,
    user: IAuthenticatedUser,
  ): Promise<IResponse<IAppointmentDetail>> => {
    try {
      const appointment =
        await this.appointmentRepository.findById(appointmentId);
      if (!appointment)
        return {
          status: 404,
          success: false,
          message: "Agendamento não encontrado.",
        };

      if (appointment.customerId !== user.id && user.role !== "ADMIN") {
        return { status: 403, success: false, message: "Acesso negado." };
      }
      return {
        status: 200,
        success: true,
        message: "Sucesso.",
        data: this.serialize(appointment),
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno.",
        error: error.message,
      };
    }
  };

  // 6. HISTÓRICO
  history = async (
    user: IAuthenticatedUser,
    query: IAppointmentHistoryQuery,
  ): Promise<IResponse<IAppointmentDetail[]>> => {
    try {
      const validation = this.validation.historyValidator(query);
      if (!validation.isValid)
        return {
          status: 400,
          success: false,
          message: "Dados inválidos.",
          error: validation.fields,
        };

      const { start } = getBrazilDayRange(parseBrazilDate(query.startDate));
      const { end } = getBrazilDayRange(parseBrazilDate(query.endDate));

      const appointments =
        user.role === "ADMIN"
          ? await this.appointmentRepository.findByPeriod(
              start,
              end,
              query.search,
            )
          : await this.appointmentRepository.findByCustomerAndPeriod(
              user.id,
              start,
              end,
            );

      return {
        status: 200,
        success: true,
        message: "Histórico listado.",
        data: appointments.map((a) => this.serialize(a)),
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno.",
        error: error.message,
      };
    }
  };

  // ==========================================
  // METODOS INTERNOS ESSENCIAIS (REDUZIDOS)
  // ==========================================

  private generateSlots(date: Date): Date[] {
    const slots: Date[] = []; // Slots para os agendamentos

    const baseDate = new Date(date).setHours(this.businessStartHour, 0, 0, 0);
    const endDate = new Date(date).setHours(this.businessEndHour, 0, 0, 0);
    let current = new Date(baseDate);

    // Enquanto o tempo atual for menor que o horário final do expediente, vamos gerando os slots com o intervalo definido.
    while (current.getTime() < endDate) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + this.slotIntervalInMinutes);
    }
    return slots;
  }

  private hasConflict(
    slotStart: Date,
    slotEnd: Date,
    appointments: IAppointmentDetail[],
  ): boolean {
    // Verificamos se existe algum agendamento que se sobrepõe a data do slot.

    // pegamos um dos agendamentos e vemos se a hora inicial é menor que o slot final
    // e se a hora final é maior que o slot inicial.
    return appointments.some(
      (a) => slotStart < new Date(a.endDate) && slotEnd > new Date(a.startDate),
    );
  }

  private async buildSameWeekSuggestion(
    customerId: number,
    appointmentDate: Date,
    excludeId?: number,
  ): Promise<any> {
    const { start, end } = getBrazilWeekRange(appointmentDate);
    const firstInWeek = await this.appointmentRepository.findFirstInWeek(
      customerId,
      start,
      end,
      excludeId,
    );

    if (
      !firstInWeek ||
      isSameBrazilCalendarDay(firstInWeek.startDate, appointmentDate)
    )
      return undefined;

    return {
      appointmentId: firstInWeek.id,
      startDate: firstInWeek.startDate,
      endDate: firstInWeek.endDate,
      message:
        "Você já possui um agendamento nesta semana. Considere concentrar os serviços no mesmo dia.",
    };
  }

  private serialize(data: any): any {
    const formatTimestamps = (obj: any) => ({
      ...obj,
      createdAt: obj.createdAt
        ? formatBrazilDateTime(obj.createdAt)
        : undefined,
      updatedAt: obj.updatedAt
        ? formatBrazilDateTime(obj.updatedAt)
        : undefined,
    });

    const serialized = formatTimestamps({
      ...data,
      startDate: formatBrazilDateTime(data.startDate),
      endDate: formatBrazilDateTime(data.endDate),
    });

    if (Array.isArray(serialized.services)) {
      serialized.services = serialized.services.map((s: any) =>
        formatTimestamps(s),
      );
    }
    return serialized;
  }
}
