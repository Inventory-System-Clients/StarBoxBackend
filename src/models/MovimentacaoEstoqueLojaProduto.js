import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const MovimentacaoEstoqueLojaProduto = sequelize.define(
  "MovimentacaoEstoqueLojaProduto",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movimentacaoEstoqueLojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "movimentacao_estoque_lojas",
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
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tipoMovimentacao: {
      type: DataTypes.ENUM("entrada", "saida"),
      allowNull: false,
      defaultValue: "saida",
      comment: "Tipo da movimentação: entrada ou saída",
    },
  },
  {
    tableName: "movimentacao_estoque_loja_produtos",
    timestamps: false,
  }
);

export default MovimentacaoEstoqueLojaProduto;
