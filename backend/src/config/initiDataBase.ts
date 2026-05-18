import sequelize from "./database.js";
import Customer from "../models/customer.model.js";
import Service from "../models/service.model.js";
import Appointment from "../models/appointment.model.js";
import AppointmentService from "../models/appointmentService.model.js";
import "../models/index.js";
import { createAdmin, createDefaultServices } from "./seed.js";

export async function initDatabase() {
  try {
    // A inicializacao do banco tambem garante o seed minimo para o fluxo principal funcionar do zero.
    console.log("Conectando e sincronizando o banco de dados SQLite...");

    await sequelize.sync();

    // Depois da sincronizacao, garantimos os registros minimos do sistema.
    await createAdmin();
    await createDefaultServices();

    console.log("Banco de dados SQLite sincronizado e pronto para uso!");
  } catch (error) {
    console.error("Erro ao sincronizar o banco de dados:", error);
    throw error;
  }
}
