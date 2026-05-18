import { Op } from "sequelize";

import Appointment from "../models/appointment.model.js";
import Service from "../models/service.model.js";

import type {
  IAppointmentCreateData,
  IAppointmentDetail,
  IAppointmentUpdateData,
} from "../types/appointment.type.js";

export default class AppointmentRepository {
  create = async (data: IAppointmentCreateData): Promise<Appointment> => {
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
    const appointment = await Appointment.findByPk(id, {
      include: [
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
