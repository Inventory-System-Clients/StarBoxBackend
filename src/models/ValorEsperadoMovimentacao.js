import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const ValorEsperadoMovimentacao = sequelize.define(
  "ValorEsperadoMovimentacao",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movimentacaoId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "movimentacao_id",
      references: {
        model: "movimentacoes",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    maquinaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "maquina_id",
      references: {
        model: "maquinas",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
      references: {
        model: "lojas",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "roteiro_id",
      references: {
        model: "roteiros",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    valorEsperado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "valor_esperado",
    },
    dataColeta: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "data_coleta",
    },
  },
  {
    tableName: "valor_esperado_movimentacao",
    timestamps: true,
    underscored: true,
  },
);

export default ValorEsperadoMovimentacao;
