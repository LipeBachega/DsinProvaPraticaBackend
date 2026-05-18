import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import type { IService, serviceType } from "../types/service.type.js";

class Service extends Model<IService, Omit<IService, "id">> {
  // Service representa o catalogo de opcoes que o cliente pode combinar no mesmo horario.
  declare id: number;
  declare price: number;
  declare estimatedTimeInMinutes: number;
  declare serviceType: serviceType;
}

Service.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    estimatedTimeInMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    serviceType: {
      type: DataTypes.ENUM("Corte de Cabelo", "Manicure", "Pintura"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Service",
    tableName: "services",
    timestamps: true,
  },
);

export default Service;
