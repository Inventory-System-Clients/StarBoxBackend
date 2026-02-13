import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

// Tabela intermediária para produtos em cada movimentação
const MovimentacaoProduto = sequelize.define(
  "MovimentacaoProduto",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movimentacaoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "movimentacoes",
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
    quantidadeSaiu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade deste produto específico que saiu",
    },
    quantidadeAbastecida: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade deste produto que foi abastecida",
    },
    retiradaProduto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade deste produto retirada (não conta no financeiro)",
    },
  },
  {
    tableName: "movimentacao_produtos",
    timestamps: true,
  },
);

export default MovimentacaoProduto;
