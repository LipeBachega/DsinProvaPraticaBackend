import {
  Model,
  DataTypes,
  type BelongsToManySetAssociationsMixin,
} from "sequelize";

import sequelize from "../config/database.js";

import type {
  IAppointment,
  AppointmentStatus,
} from "../types/appointment.type.js";

class Appointment extends Model<IAppointment> implements IAppointment {
  // Este model guarda o cabecalho do agendamento; os servicos ficam na relacao N:N.
  declare id: number;

  declare customerId: number;

  declare startDate: Date;

  declare endDate: Date;

  declare status: AppointmentStatus;

  declare setServices: BelongsToManySetAssociationsMixin<any, number>;
}

Appointment.init(
  {
    id: {
      type: DataTypes.INTEGER,

      autoIncrement: true,

      primaryKey: true,
    },

    customerId: {
      type: DataTypes.INTEGER,

      allowNull: false,

      references: {
        model: "customers",

        key: "id",
      },
    },

    startDate: {
      type: DataTypes.DATE,

      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATE,

      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("PENDENTE", "CONFIRMADO", "CONCLUIDO", "CANCELADO"),

      defaultValue: "PENDENTE",

      allowNull: false,
    },
  },
  {
    sequelize,

    modelName: "Appointment",

    tableName: "appointments",

    timestamps: true,
  },
);

export default Appointment;
