import Customer from "../models/customer.model.js";
import Service from "../models/service.model.js";

import { hashPassword } from "../utils/hash.lib.js";

export async function createAdmin() {
  // Evita criar o mesmo admin toda vez que a aplicacao reinicia.
  const adminExists = await Customer.findOne({
    where: {
      role: "ADMIN",
    },
  });

  if (adminExists) {
    console.log("Admin já existe.");

    return;
  }

  const password = await hashPassword("admin123");

  await Customer.create({
    name: "Leila",
    email: "leila@email.com",
    password,
    phone: "14991234567",
    role: "ADMIN",
  });

  console.log("Admin padrão criado.");
}

export async function createDefaultServices() {
  // O fluxo de agendamento depende destes servicos existirem no banco.
  const servicesCount = await Service.count();

  if (servicesCount > 0) {
    console.log("ServiÃ§os padrÃ£o jÃ¡ existem.");
    return;
  }

  await Service.bulkCreate([
    {
      serviceType: "Corte de Cabelo",
      price: 50,
      estimatedTimeInMinutes: 60,
    },
    {
      serviceType: "Manicure",
      price: 35,
      estimatedTimeInMinutes: 45,
    },
    {
      serviceType: "Pintura",
      price: 120,
      estimatedTimeInMinutes: 120,
    },
  ]);

  console.log("ServiÃ§os padrÃ£o criados.");
}
