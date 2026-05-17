import Customer from "../models/customer.model.js";
import type { ICustomer, ICustomerCreate } from "../types/customer.type.js";

export default class CustomerService {
  create = async (customer: ICustomerCreate): Promise<ICustomer> => {
    const createCustomer = await Customer.create(customer);

    return createCustomer.dataValues;
  };
}
