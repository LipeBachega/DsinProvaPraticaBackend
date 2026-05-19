import { Op } from "sequelize";

import Appointment from "../models/appointment.model.js";
import Customer from "../models/customer.model.js";
import Service from "../models/service.model.js";

import type {
  IAppointmentCreateData,
  IAppointmentDetail,
  IAppointmentUpdateData,
} from "../types/appointment.type.js";

export default class AppointmentRepository {
  create = async (data: IAppointmentCreateData): Promise<Appointment> => {
    // Primeiro gravamos o cabecalho do agendamento; os servicos entram na tabela N:N.
    const appointment = await Appointment.create({
      customerId: data.customerId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "PENDENTE",
    });

    await appointment.setServices(data.serviceIds);

    return appointment;
  };

  findById = async (id: number): Promise<IAppointmentDetail | null> => {
    // O detalhe sempre traz os servicos, porque eles sao parte central do caso de uso.
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Service,

          as: "services",

          through: {
            attributes: [],
          },
        },
      ],

      order: [
        [
          {
            model: Service,
            as: "services",
          },

          "id",

          "ASC",
        ],
      ],
    });

    if (!appointment) {
      return null;
    }

    return appointment.toJSON() as IAppointmentDetail;
  };

  update = async (
    appointment: Appointment,
    data: IAppointmentUpdateData,
  ): Promise<void> => {
    await appointment.update({
      startDate: data.startDate,

      endDate: data.endDate,
    });

    if (data.serviceIds) {
      await appointment.setServices(data.serviceIds);
    }
  };

  updateStatus = async (
    appointment: Appointment,
    status: IAppointmentDetail["status"],
  ): Promise<void> => {
    await appointment.update({ status });
  };

  findModelById = async (id: number): Promise<Appointment | null> => {
    return Appointment.findByPk(id);
  };

  findByCustomerAndPeriod = async (
    customerId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<IAppointmentDetail[]> => {
    const appointments = await Appointment.findAll({
      where: {
        customerId,

        startDate: {
          [Op.between]: [startDate, endDate],
        },
      },

      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Service,

          as: "services",

          through: {
            attributes: [],
          },
        },
      ],

      order: [["startDate", "ASC"]],
    });

    return appointments.map(
      (appointment) => appointment.toJSON() as IAppointmentDetail,
    );
  };

  findByPeriod = async (
    startDate: Date,
    endDate: Date,
    search?: string,
  ): Promise<IAppointmentDetail[]> => {
    const normalizedSearch = search?.trim();
    const sanitizedPhoneSearch = normalizedSearch?.replace(/\D/g, "");

    const appointments = await Appointment.findAll({
      where: {
        startDate: {
          [Op.between]: [startDate, endDate],
        },
      },

      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "email", "phone"],
          ...(normalizedSearch
            ? {
                where: {
                  [Op.or]: [
                    {
                      name: {
                        [Op.like]: `%${normalizedSearch}%`,
                      },
                    },
                    {
                      phone: {
                        [Op.like]: `%${sanitizedPhoneSearch || normalizedSearch}%`,
                      },
                    },
                  ],
                },
              }
            : {}),
        },
        {
          model: Service,

          as: "services",

          through: {
            attributes: [],
          },
        },
      ],

      order: [["startDate", "ASC"]],
    });

    return appointments.map(
      (appointment) => appointment.toJSON() as IAppointmentDetail,
    );
  };

  findFirstInWeek = async (
    customerId: number,
    startDate: Date,
    endDate: Date,
    excludeAppointmentId?: number,
  ): Promise<IAppointmentDetail | null> => {
    const where: Record<string, any> = {
      customerId,

      startDate: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (excludeAppointmentId) {
      where.id = {
        [Op.ne]: excludeAppointmentId,
      };
    }

    const appointment = await Appointment.findOne({
      where,

      include: [
        {
          model: Service,

          as: "services",

          through: {
            attributes: [],
          },
        },
      ],

      order: [["startDate", "ASC"]],
    });

    if (!appointment) {
      return null;
    }

    return appointment.toJSON() as IAppointmentDetail;
  };

  findByDay = async (
    startDate: Date,
    endDate: Date,
    excludeAppointmentId?: number,
  ): Promise<IAppointmentDetail[]> => {
    // Cancelados nao entram em conflito, por isso sao excluidos da agenda do dia.
    const where: Record<string, any> = {
      startDate: {
        [Op.between]: [startDate, endDate],
      },

      status: {
        [Op.ne]: "CANCELADO",
      },
    };

    if (excludeAppointmentId) {
      where.id = {
        [Op.ne]: excludeAppointmentId,
      };
    }

    const appointments = await Appointment.findAll({
      where,

      include: [
        {
          model: Service,

          as: "services",

          through: {
            attributes: [],
          },
        },
      ],

      order: [["startDate", "ASC"]],
    });

    return appointments.map(
      (appointment) => appointment.toJSON() as IAppointmentDetail,
    );
  };
}
