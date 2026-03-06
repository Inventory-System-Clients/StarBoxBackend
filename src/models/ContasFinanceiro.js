// Modelo Sequelize para contas financeiras
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const ContasFinanceiro = sequelize.define(
  "ContasFinanceiro",
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
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    bill_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    observations: {
      type: DataTypes.TEXT,
    },
    payment_method: {
      type: DataTypes.STRING,
      defaultValue: "boleto",
      comment: "Método de pagamento: boleto, pix ou email",
    },
    payment_details: {
      type: DataTypes.STRING(500),
      comment: "Detalhes de pagamento (número PIX, email ou código boleto)",
    },
  },
  {
    tableName: "contas_financeiro",
    timestamps: false,
  },
);

export default ContasFinanceiro;
