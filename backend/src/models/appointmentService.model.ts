import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js";

class AppointmentService extends Model {
  public id!: number;
  public appointmentId!: number;
  public serviceId!: number;
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
