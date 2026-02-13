import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RegistroDinheiro = sequelize.define(
  "RegistroDinheiro",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    lojaId: {
      type: DataTypes.STRING, // Aceita UUID
      allowNull: false,
    },
    maquinaId: {
      type: DataTypes.STRING, // Aceita UUID
      allowNull: true,
    },
    registrarTotalLoja: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    inicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fim: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    valorDinheiro: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    valorCartaoPix: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "registro_dinheiro",
    timestamps: true,
  },
);

export default RegistroDinheiro;
