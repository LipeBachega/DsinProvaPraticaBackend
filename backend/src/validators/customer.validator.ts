import type { ICustomerCreate } from "../types/customer.type.js";
import type { IValidationError } from "../types/validation.type.js";

export default class CustomerValidator {
  createCustomerValidator = (customer: ICustomerCreate): IValidationError => {
    const fields: { field: string; error: string }[] = [];

    // 1. Validação do Nome
    if (!customer.name || customer.name.trim().length < 3) {
      fields.push({
        field: "name",
        error: "O nome é obrigatório e deve ter pelo menos 3 caracteres.",
      });
    }

    // 2. Validação do E-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customer.email) {
      fields.push({ field: "email", error: "O e-mail é obrigatório." });
    } else if (!emailRegex.test(customer.email)) {
      fields.push({
        field: "email",
        error: "Insira um endereço de e-mail válido.",
      });
    }

    // 3. Validação do Telefone (Focado em credencial de login única)
    if (!customer.phone) {
      fields.push({ field: "phone", error: "O telefone é obrigatório." });
    } else {
      const cleanPhone = customer.phone.replace(/\D/g, "");
      const phoneRegex = /^\d{10,11}$/; // Aceita fixo (10 dígitos) ou celular (11 dígitos) com DDD

      if (!phoneRegex.test(cleanPhone)) {
        fields.push({
          field: "phone",
          error:
            "Insira um telefone válido com DDD (apenas números, contendo 10 ou 11 dígitos).",
        });
      }
    }

    // 4. Validação da Senha
    if (!customer.password || customer.password.length < 6) {
      fields.push({
        field: "password",
        error: "A senha é obrigatória e deve ter no mínimo 6 caracteres.",
      });
    }

    if (fields.length > 0) {
      return {
        isValid: false,
        fields,
      };
    }

    return {
      isValid: true,
    };
  };
}
