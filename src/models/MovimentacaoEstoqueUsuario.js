import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const MovimentacaoEstoqueUsuario = sequelize.define(
  "MovimentacaoEstoqueUsuario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    lancadoPorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    produtoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "produtos",
        key: "id",
      },
    },
    tipoMovimentacao: {
      type: DataTypes.ENUM("entrada", "saida"),
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    quantidadeAnterior: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    quantidadeAtual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    dataMovimentacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    atualizadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "movimentacoes_estoque_usuarios",
    timestamps: true,
    createdAt: "dataMovimentacao",
    updatedAt: "atualizadoEm",
    indexes: [
      { fields: ["usuarioId", "dataMovimentacao"] },
      { fields: ["lancadoPorId", "dataMovimentacao"] },
      { fields: ["produtoId"] },
    ],
  },
);

export default MovimentacaoEstoqueUsuario;
