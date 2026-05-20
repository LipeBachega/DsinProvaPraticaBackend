# Backend — Cabeleleila Leila

API do sistema de agendamentos do salão.

## Tecnologias

- **Node.js** com **TypeScript**
- **Fastify** — framework HTTP rápido e leve
- **Sequelize** — ORM para lidar com o banco de dados
- **SQLite** — banco de dados que funciona como arquivo local (sem instalar nada extra)
- **JWT** — autenticação por token
- **Argon2** — criptografia de senhas

## Como rodar

```bash
cd Back/backend
npm install
npm run dev
```

O servidor sobe em `http://localhost:3333`. O banco SQLite é criado sozinho na primeira execução, junto com os dados iniciais (admin + serviços).

## .env

exemplo de .env

```
PORT=3333
JWT_SECRET=super_secret_key
```

## Dados iniciais (seed)

Na primeira vez que rodar, o sistema cria:

- **Admin:** `leila@email.com` / `admin123`
- **Serviços:** Corte de Cabelo (R$50 / 60min), Manicure (R$35 / 45min), Pintura (R$120 / 120min)

## Banco de dados

4 tabelas no SQLite:

- `customers` — clientes e admin
- `services` — catálogo de serviços
- `appointments` — agendamentos (data, status, cliente)
- `appointment_services` — liga agendamento aos serviços escolhidos (relação N:N)


Fluxo: `Route → Controller → Service → Repository → Banco`

## Endpoints

| Método  | Rota                                           | Auth        | Descrição                         |
| ------- | ---------------------------------------------- | ----------- | --------------------------------- |
| `GET`   | `/health`                                      | Não         | Verifica se o servidor está no ar |
| `POST`  | `/customers`                                   | Não         | Criar conta de cliente            |
| `POST`  | `/login`                                       | Não         | Fazer login, recebe token JWT     |
| `GET`   | `/services`                                    | Não         | Listar serviços disponíveis       |
| `GET`   | `/appointments/availability?date=&serviceIds=` | Sim         | Ver horários livres               |
| `POST`  | `/appointments`                                | Sim         | Criar agendamento                 |
| `GET`   | `/appointments/history?startDate=&endDate=`    | Sim         | Histórico por período             |
| `GET`   | `/appointments/:id`                            | Sim         | Detalhes de um agendamento        |
| `PUT`   | `/appointments/:id`                            | Sim         | Reagendar (alterar data/hora)     |
| `PATCH` | `/appointments/:id/status`                     | Sim (Admin) | Alterar status (admin apenas)     |


## Regras principais

- Expediente: **08:00 às 18:00**, slots de 30 em 30 minutos
- Cliente pode agendar **vários serviços** de uma vez
- **Reagendamento** só até **2 dias antes** (cliente); admin pode sempre
- Se o cliente já tem agendamento na **mesma semana**, o sistema **sugere** marcar no mesmo dia
- Status do agendamento: `PENDENTE → CONFIRMADO → CONCLUIDO` (ou `CANCELADO`)
- Só admin muda status; cliente só pode reagendar

## Scripts

```bash
npm run dev      # Desenvolvimento com live reload (tsx watch)
npm run build    # Compilar TypeScript → dist/
npm run start    # Rodar versão compilada em produção
```
