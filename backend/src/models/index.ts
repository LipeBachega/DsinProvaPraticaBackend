import Appointment from "./appointment.model.js";
import AppointmentService from "./appointmentService.model.js";
import Customer from "./customer.model.js";
import Service from "./service.model.js";

// Este arquivo centraliza os relacionamentos para o Sequelize montar os joins corretamente.

// Relacao 1:N -> Um cliente tem varios agendamentos.
Customer.hasMany(Appointment, { foreignKey: "customerId", as: "appointments" });
Appointment.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

// Relacao N:N -> Um agendamento pode agrupar varios servicos no mesmo horario.
Appointment.belongsToMany(Service, {
  through: AppointmentService,
  foreignKey: "appointmentId",
  otherKey: "serviceId",
  as: "services",
});

Service.belongsToMany(Appointment, {
  through: AppointmentService,
  foreignKey: "serviceId",
  otherKey: "appointmentId",
  as: "appointments",
});

export { Customer, Service, Appointment, AppointmentService };
