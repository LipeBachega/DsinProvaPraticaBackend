import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

import { customerRoutes } from "./routes/customer.route.js";
import { initDatabase } from "./config/initiDataBase.js";

dotenv.config();

const fastify = Fastify({
  logger: true, // Logs no console ajudam muito a debugar durante o teste
});

async function bootstrap() {
  // Configurando o CORS para permitir que o React acesse o Back
  await fastify.register(cors, {
    origin: "*", // Em produção você limitaria, mas para o teste local isso evita travas
  });

  // Rotas
  await fastify.register(customerRoutes);

  // Rota de teste
  fastify.get("/health", async (request, reply) => {
    return {
      status: "OK",
      message: "Servidor da Cabeleleila Leila rodando perfeitamente!",
    };
  });

  const port = Number(process.env.PORT) || 3333;

  try {
    await initDatabase();
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Servidor rodando em http://localhost:${port}`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
