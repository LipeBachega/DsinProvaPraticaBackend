import type { ICustomer, ICustomerCreate } from "../types/customer.type.js";
import type IResponse from "../types/response.type.js";
import CustomerRepository from "../repositories/customer.repository.js";
import CustomerValidator from "../validators/customer.validator.js";

export default class CustomerService {
  private validation = new CustomerValidator();
  private customerRepository = new CustomerRepository();

  create = async (
    customer: ICustomerCreate,
  ): Promise<IResponse<Omit<ICustomer, "password">>> => {
    
    // 1. Validação sintática (Formato, Regex, Tamanho)
    const { isValid, fields } = this.validation.createCustomerValidator(customer);

    if (!isValid) {
      return {
        status: 400,
        success: false,
        message: "Os dados fornecidos não são válidos.",
        error: fields,
      };
    }

    try {
      // 2. Sanitização do telefone para busca e persistência homogênea
      customer.phone = customer.phone.replace(/\D/g, "");

      // 3. Validação preventiva de Telefone Único
      const customerPhoneUnique = await this.customerRepository.findByPhone(customer.phone);
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

      // 4. Validação preventiva de E-mail Único
      const customerEmailUnique = await this.customerRepository.findByEmail(customer.email);
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

      // 5. Persistência segura na camada de Repositório
      const createdCustomer = await this.customerRepository.create(customer);

      // 6. Separação de dados sensíveis (Omitindo password da resposta)
      const { password, ...customerData } = createdCustomer;

      return {
        status: 201,
        success: true,
        message: "Cliente criado com sucesso.",
        data: customerData,
      };
    } catch (error: any) {
      // Como as validações de duplicidade já foram feitas acima de forma preventiva,
      // qualquer erro que caia aqui será estritamente um problema de infraestrutura ou banco offline.
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor ao processar o cadastro.",
        error: error.message,
      };
    }
  };
}