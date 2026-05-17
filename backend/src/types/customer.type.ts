export interface ICustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ICustomerCreate extends ICustomer {
  password: string;
}