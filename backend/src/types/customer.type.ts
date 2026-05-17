export interface ICustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export type ICustomerCreate = Omit<ICustomer, "id">;
