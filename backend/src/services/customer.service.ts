import type { ICustomer, ICustomerCreate } from "../types/customer.type.js";
import type IResponse from "../types/response.type.js";
import CustomerRepository from "../repositories/customer.repository.js";
import CustomerValidator from "../validators/customer.validator.js";
import { hashPassword } from "../utils/hash.lib.js";

export default class CustomerService {
  private validation = new CustomerValidator();
  private customerRepository = new CustomerRepository();

  create = async (customer: ICustomerCreate): Promise<IResponse> => {
    // Primeiro validamos os campos obrigatorios recebidos da requisicao.
    const { isValid, fields } =
      this.validation.createCustomerValidator(customer);

    if (!isValid) {
      return {
        status: 400,
        success: false,
        message: "Os dados fornecidos não são válidos.",
        error: fields,
      };
    }

    try {
      // Padroniza telefone e e-mail antes de comparar e salvar no banco.
      const sanitizedPhone = customer.phone.replace(/\D/g, "");
      const normalizedEmail = customer.email.trim().toLowerCase();

      const customerPhoneUnique =
        await this.customerRepository.findByPhone(sanitizedPhone);
      if (customerPhoneUnique) {
        return {
          status: 400,
          success: false,
          message: "Os dados fornecidos não são válidos.",
          error: [
            {
              field: "phone",
              error: "Este número de telefone já está cadastrado no sistema.",
            },
          ],
        };
      }

      const customerEmailUnique =
        await this.customerRepository.findByEmail(normalizedEmail);
      if (customerEmailUnique) {
        return {
          status: 400,
          success: false,
          message: "Os dados fornecidos não são válidos.",
          error: [
            {
              field: "email",
              error: "Este e-mail já está cadastrado no sistema.",
            },
          ],
        };
      }

      // A senha e protegida antes de ser persistida.
      const customerPassword = await hashPassword(customer.password);

      // Este objeto final concentra os dados tratados que vao para o repositorio.
      const sanitizedCustomer = {
        ...customer,
        email: normalizedEmail,

        phone: sanitizedPhone,

        password: customerPassword,
      };

      // O repositorio encapsula a conversa direta com o banco.
      await this.customerRepository.create(sanitizedCustomer);

      return {
        status: 201,
        success: true,
        message: "Cliente criado com sucesso.",
      };
    } catch (error: any) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor ao processar o cadastro.",
        error: error.message,
      };
    }
  };
}
