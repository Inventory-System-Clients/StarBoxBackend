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
    boleto_em_maos: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indica se o boleto foi recebido ou está em mãos",
    },
    recorrente: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indica se a conta se repete todos os meses na mesma data",
    },
    beneficiario: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Nome da pessoa ou empresa que receberá o pagamento",
    },
    numero: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Número do documento, boleto, conta ou código de referência",
    },
  },
  {
    tableName: "contas_financeiro",
    timestamps: false,
  },
);

export default ContasFinanceiro;
