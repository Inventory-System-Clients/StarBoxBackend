// Modelo Sequelize para usuários financeiros
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const FinanceiroUser = sequelize.define(
  "FinanceiroUser",
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
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "financeiro_users",
    timestamps: false,
  },
);

export default FinanceiroUser;
