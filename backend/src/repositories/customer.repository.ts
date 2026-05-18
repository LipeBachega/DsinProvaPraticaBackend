import Customer from "../models/customer.model.js";
import type { ICustomer, ICustomerCreate } from "../types/customer.type.js";

export default class CustomerRepository {
  create = async (customer: ICustomerCreate): Promise<ICustomer> => {
    // O repository encapsula o Sequelize para o restante da aplicacao trabalhar com objetos simples.
    const createdCustomer = await Customer.create(customer);

    // Retorna o objeto JavaScript Puro, garantindo que o ID venha populado e sem travas do Sequelize
    return createdCustomer.toJSON() as ICustomer;
  };

  findByEmail = async (email: string): Promise<ICustomer | null> => {
    const customer = await Customer.findOne({ where: { email } });

    if (!customer) {
      return null;
    }

    return customer.toJSON() as ICustomer;
  };

  findByPhone = async (phone: string): Promise<ICustomer | null> => {
    const customer = await Customer.findOne({ where: { phone } });
    if (!customer) {
      return null;
    }

    return customer.toJSON() as ICustomer;
  };

  findByEmailWithPassword = async (
    email: string,
  ): Promise<ICustomer | null> => {
    const customer = await Customer.scope("withPassword").findOne({
      where: { email },
    });

    if (!customer) {
      return null;
    }

    return customer.toJSON() as ICustomer;
  };

  findById = async (id: number): Promise<ICustomer | null> => {
    // Esta busca e usada quando o admin agenda em nome de outra pessoa.
    const customer = await Customer.findByPk(id);

    if (!customer) {
      return null;
    }

    return customer.toJSON() as ICustomer;
  };
}
