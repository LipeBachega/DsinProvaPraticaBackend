import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// Tabela de juncao entre agendamentos e servicos.
class AppointmentService extends Model {
  declare id: number;
  declare appointmentId: number;
  declare serviceId: number;
}

AppointmentService.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "appointments",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "services",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "AppointmentService",
    tableName: "appointment_services",
    timestamps: false,
  },
);

export default AppointmentService;
