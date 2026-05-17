import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js"; // Lembre-se do .js no final por conta do ES Modules/NodeNext
import type { ICustomer } from "../types/customer.type.js";

class Customer extends Model<ICustomer> {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string;
}

Customer.init(
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Customer",
    tableName: "customers",
    timestamps: true,
  },
);

export default Customer;
