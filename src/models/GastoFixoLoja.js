import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const GastoFixoLoja = sequelize.define(
  "GastoFixoLoja",
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
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "gastos_fixos_loja",
    timestamps: true,
    indexes: [
      {
        fields: ["lojaId"],
      },
    ],
  },
);

export default GastoFixoLoja;