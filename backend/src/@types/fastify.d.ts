import type { IUserRole } from "../types/customer.type.js";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: number;
      email: string;
      role: IUserRole;
    };
  }
}
