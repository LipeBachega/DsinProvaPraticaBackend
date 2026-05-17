import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js"; // Lembre-se do .js no final por conta do ES Modules/NodeNext
import type { IService, serviceType } from "../types/service.type.js";

class Service extends Model<IService> {
  public id!: number;
  public name!: string;
  public price!: number;
  public serviceType!: serviceType;
}

Service.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
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
