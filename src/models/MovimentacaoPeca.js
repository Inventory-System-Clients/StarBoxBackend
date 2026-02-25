import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const MovimentacaoPeca = sequelize.define(
  "MovimentacaoPeca",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movimentacaoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'movimentacaoid',
    },
    pecaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "movimentacao_pecas",
    timestamps: true,
  }
);

export default MovimentacaoPeca;
