import type {
  UserRole,
} from "../types/customer.type.js";

declare module "fastify" {

  interface FastifyRequest {

    user: {
      id: number;
      email: string;
      role: UserRole;
    };
  }
}