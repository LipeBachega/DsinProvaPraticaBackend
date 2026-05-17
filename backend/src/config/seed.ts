import Customer from "../models/customer.model.js";

import { hashPassword } from "../utils/hash.lib.js";

export async function createAdmin() {
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
