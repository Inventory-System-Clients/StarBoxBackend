// Modelo Sequelize para categorias financeiras
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const FinanceiroCategory = sequelize.define(
  "FinanceiroCategory",
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
  },
  {
    tableName: "financeiro_categories",
    timestamps: false,
  },
);

export default FinanceiroCategory;
