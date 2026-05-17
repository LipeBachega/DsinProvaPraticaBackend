export type AppointmentStatus =
  | "PENDENTE"
  | "CONFIRMADO"
  | "CONCLUIDO"
  | "CANCELADO";

export interface IAppointment {
  id?: number;
  customerId: number;
  date: Date | string;
  status: AppointmentStatus;
}
