import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const EstoqueLoja = sequelize.define(
  "EstoqueLoja",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lojas",
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
      validate: {
        min: 0,
      },
      comment: "Quantidade em estoque na loja",
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Estoque mínimo para alerta",
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Produto ativo no estoque da loja",
    },
  },
  {
    tableName: "estoque_lojas",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["lojaId", "produtoId"],
      },
    ],
  }
);

export default EstoqueLoja;
