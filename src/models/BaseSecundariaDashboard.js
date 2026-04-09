import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const BaseSecundariaDashboard = sequelize.define(
  "BaseSecundariaDashboard",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nomeBase: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      field: "nome_base",
      comment: "Nome da base secundaria exibida no dashboard",
    },
    quantidadeProdutos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "quantidade_produtos",
      validate: {
        min: 0,
      },
      comment: "Quantidade total de produtos informada manualmente para a base",
    },
    modelosProdutos: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "modelos_produtos",
      comment: "Modelos de produtos informados manualmente para a base",
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "bases_secundarias_dashboard",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["nome_base"],
      },
    ],
  },
);

export default BaseSecundariaDashboard;