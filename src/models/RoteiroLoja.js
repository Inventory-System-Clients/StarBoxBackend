import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

// Tabela de junção entre Roteiro e Loja com suporte a ordenação
const RoteiroLoja = sequelize.define(
  "RoteiroLojas",
  {
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ordem: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    tableName: "RoteiroLojas",
    timestamps: false,
  }
);

export default RoteiroLoja;
