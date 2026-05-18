import type {
  IAppointmentAvailabilityQuery,
  IAppointmentCreateData,
  IAppointmentCreateInput,
  IAppointmentHistoryQuery,
  IAppointmentUpdateInput,
} from "../types/appointment.type.js";
import type { IValidationError } from "../types/validation.type.js";
import { parseBrazilDate, parseBrazilDateTime } from "../utils/datetime.lib.js";

export default class AppointmentValidator {
  availabilityValidator = (
    query: IAppointmentAvailabilityQuery,
  ): IValidationError => {
    const fields: { field: string; error: string }[] = [];

    if (!Array.isArray(query.serviceIds) || query.serviceIds.length === 0) {
      fields.push({
        field: "serviceIds",
        error: "Informe ao menos um servico para consultar a disponibilidade.",
      });
    }

    if (!this.isValidDateOnlyInput(query.date)) {
      fields.push({
        field: "date",
        error: "Informe uma data valida no formato YYYY-MM-DD.",
      });
    }

    return this.buildValidationResult(fields);
  };

  createValidator = (
    data:
      | IAppointmentCreateInput
      | IAppointmentCreateData
      | IAppointmentUpdateInput,
  ): IValidationError => {
    const fields: { field: string; error: string }[] = [];

    if (!Array.isArray(data.serviceIds) || data.serviceIds.length === 0) {
      fields.push({
        field: "serviceIds",
        error: "Informe ao menos um servico para realizar o agendamento.",
      });
    }

    if (!this.isValidDateTimeInput(data.startDate)) {
      fields.push({
        field: "startDate",
        error: "Informe uma data e horario validos para o agendamento.",
      });
    } else if (this.isPastDateTimeInput(data.startDate)) {
      // O sistema nao deve permitir criar ou mover agendamentos para um horario que ja passou.
      fields.push({
        field: "startDate",
        error: "Informe uma data e horario futuros para o agendamento.",
      });
    }

    if ("customerId" in data && data.customerId !== undefined) {
      const customerId = Number(data.customerId);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        fields.push({
          field: "customerId",
          error: "Informe um cliente valido para o agendamento.",
        });
      }
    }

    return this.buildValidationResult(fields);
  };

  updateValidator = (data: IAppointmentUpdateInput): IValidationError => {
    const validation = this.createValidator(data);

    if (!validation.isValid && validation.fields) {
      validation.fields = validation.fields.map((field) =>
        field.field === "serviceIds"
          ? {
              field: "serviceIds",
              error: "Informe ao menos um servico para alterar o agendamento.",
            }
          : field,
      );
    }

    return validation;
  };

  historyValidator = (query: IAppointmentHistoryQuery): IValidationError => {
    const fields: { field: string; error: string }[] = [];

    // Historico trabalha com datas fechadas por dia, entao o contrato exige YYYY-MM-DD.
    if (!this.isValidDateOnlyInput(query.startDate)) {
      fields.push({
        field: "startDate",
        error: "Informe uma data inicial valida no formato YYYY-MM-DD.",
      });
    }

    if (!this.isValidDateOnlyInput(query.endDate)) {
      fields.push({
        field: "endDate",
        error: "Informe uma data final valida no formato YYYY-MM-DD.",
      });
    }

    if (fields.length === 0) {
      const startDate = parseBrazilDate(query.startDate);
      const endDate = parseBrazilDate(query.endDate);

      if (startDate > endDate) {
        fields.push({
          field: "period",
          error: "A data inicial nao pode ser maior que a data final.",
        });
      }
    }

    return this.buildValidationResult(fields);
  };

  private isValidDateOnlyInput(date: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    const parsedDate = parseBrazilDate(date);
    return !Number.isNaN(parsedDate.getTime());
  }

  private isValidDateTimeInput(dateTime: string | Date): boolean {
    const parsedDate = parseBrazilDateTime(dateTime);
    return !Number.isNaN(parsedDate.getTime());
  }

  private isPastDateTimeInput(dateTime: string | Date): boolean {
    const parsedDate = parseBrazilDateTime(dateTime);
    return parsedDate.getTime() < Date.now();
  }

  private buildValidationResult(
    fields: { field: string; error: string }[],
  ): IValidationError {
    if (fields.length > 0) {
      return {
        isValid: false,
        fields,
      };
    }

    return {
      isValid: true,
    };
  }
}
