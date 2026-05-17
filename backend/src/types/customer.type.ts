export interface ICustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: IUserRole;
}

export type ICustomerCreate = Omit<ICustomer, "id" | "role">;

export type IUserRole = "CUSTOMER" | "ADMIN";

export type ICustomerInternalCreate = Omit<ICustomer, "id">;
