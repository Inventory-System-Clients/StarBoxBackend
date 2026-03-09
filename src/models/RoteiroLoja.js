import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

// Tabela de junção entre Roteiro e Loja com suporte a ordenação
// Nomes das colunas em PascalCase pois foram criadas automaticamente pelo Sequelize
const RoteiroLoja = sequelize.define(
  "RoteiroLojas",
  {
    RoteiroId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    LojaId: {
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
