import sequelize from "./database.js";
import Customer from "../models/customer.model.js";
import Service from "../models/service.model.js";
import Appointment from "../models/appointment.model.js";
import AppointmentService from "../models/appointmentService.model.js";
import { createAdmin } from "./seed.js";

export async function initDatabase() {
  try {
    console.log("Conectando e sincronizando o banco de dados SQLite...");

    await sequelize.sync({ alter: true });

    await createAdmin();

    console.log("Banco de dados SQLite sincronizado e pronto para uso!");
  } catch (error) {
    console.error("Erro ao sincronizar o banco de dados:", error);
    throw error;
  }
}
