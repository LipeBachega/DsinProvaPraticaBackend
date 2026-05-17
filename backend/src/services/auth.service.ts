import type IResponse from "../types/response.type.js";

import type { ILogin } from "../types/auth.type.js";

import CustomerRepository from "../repositories/customer.repository.js";

import { verifyPassword } from "../utils/hash.lib.js";

import { generateToken } from "../utils/jwt.lib.js";

export default class AuthService {
  private customerRepository = new CustomerRepository();

  login = async (data: ILogin): Promise<IResponse> => {
    try {
      const customer = await this.customerRepository.findByEmailWithPassword(
        data.email,
      );

      if (!customer) {
        return {
          status: 401,
          success: false,
          message: "E-mail ou senha inválidos.",
        };
      }

      const passwordMatch = await verifyPassword(
        customer.password,
        data.password,
      );

      if (!passwordMatch) {
        return {
          status: 401,
          success: false,
          message: "E-mail ou senha inválidos.",
        };
      }

      const token = generateToken({
        id: customer.id,
        email: customer.email,
        role: customer.role,
      });

      return {
        status: 200,
        success: true,
        message: "Login realizado com sucesso.",

        data: {
          token,
        },
      };
    } catch (error: unknown) {
      return {
        status: 500,
        success: false,
        message: "Erro interno no servidor.",

        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  };
}
