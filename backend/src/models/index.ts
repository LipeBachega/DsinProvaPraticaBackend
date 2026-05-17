import Appointment from "./appointment.model.js";
import AppointmentService from "./appointmentService.model.js";
import Customer from "./customer.model.js";
import Service from "./service.model.js";


// Relação 1:N -> Um Cliente tem vários Agendamentos
Customer.hasMany(Appointment, { foreignKey: "customerId", as: "appointments" });
Appointment.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

// Relação N:N -> Um Agendamento tem muitos Serviços (e vice-versa)
Appointment.belongsToMany(Service, {
  through: AppointmentService,
  foreignKey: "appointmentId",
  otherKey: "serviceId",
  as: "services"
});

Service.belongsToMany(Appointment, {
  through: AppointmentService,
  foreignKey: "serviceId",
  otherKey: "appointmentId",
  as: "appointments"
});

export { Customer, Service, Appointment, AppointmentService };