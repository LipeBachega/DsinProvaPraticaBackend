import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database.js"; // Lembre-se do .js no final por conta do ES Modules/NodeNext
import type {
  ICustomer,
  ICustomerCreate,
  ICustomerInternalCreate,
  IUserRole,
} from "../types/customer.type.js";

class Customer extends Model<
  ICustomer,
  ICustomerInternalCreate | ICustomerCreate
> {
  // Os declares ajudam o TypeScript a entender os campos que o Sequelize injeta no model.
  declare id: number;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare password: string;
  declare role: IUserRole;
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
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("CUSTOMER", "ADMIN"),
      allowNull: false,
      defaultValue: "CUSTOMER",
    },
  },
  {
    sequelize,

    modelName: "Customer",

    tableName: "customers",

    timestamps: true,

    defaultScope: {
      attributes: {
        exclude: ["password"],
      },
    },

    scopes: {
      withPassword: {},
    },
  },
);

export default Customer;
