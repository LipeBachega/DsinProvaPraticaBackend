export type AppointmentStatus =
  | "PENDENTE"
  | "CONFIRMADO"
  | "CONCLUIDO"
  | "CANCELADO";

export interface IAppointment {
  id?: number;
  customerId: number;
  startDate: Date | string;
  endDate: Date | string;
  status: AppointmentStatus;
}

export interface IAppointmentCreateInput {
  startDate: string;
  serviceIds: number[];
}

export interface IAppointmentUpdateInput {
  startDate: string;
  serviceIds: number[];
}

export interface IAppointmentStatusUpdateInput {
  status: AppointmentStatus;
}

export interface IAppointmentCreateData {
  customerId: number;
  startDate: Date;
  endDate: Date;
  serviceIds: number[];
}

export interface IAppointmentUpdateData {
  startDate: Date;
  endDate: Date;
  serviceIds?: number[];
}

export interface IAppointmentHistoryQuery {
  startDate: string;
  endDate: string;
}

export interface IAppointmentAvailabilityQueryInput {
  date?: string;
  serviceIds?: string | string[];
  appointmentId?: string;
}

export interface IAppointmentAvailabilityQuery {
  date: string;
  serviceIds: number[];
  appointmentId?: number;
}

export interface IAppointmentDetail extends IAppointment {
  id: number;
  services: {
    id: number;
    price: number;
    estimatedTimeInMinutes: number;
    serviceType: string;
  }[];
}

export interface IAppointmentSuggestion {
  appointmentId: number;
  startDate: Date | string;
  endDate: Date | string;
  message: string;
}

export interface IAppointmentResponseData {
  appointment: IAppointmentDetail;
  suggestion?: IAppointmentSuggestion;
}

export interface IAppointmentAvailabilitySlot {
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
}

export interface IAppointmentAvailabilityResponse {
  date: string;
  requiredDurationInMinutes: number;
  availableSlots: IAppointmentAvailabilitySlot[];
}
