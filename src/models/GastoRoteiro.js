import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const GastoRoteiro = sequelize.define(
  "GastoRoteiro",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "roteiro_id",
      references: {
        model: "Roteiros",
        key: "id",
      },
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuario_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    categoria: {
      type: DataTypes.ENUM(
        "transporte",
        "estadia",
        "abastecimento",
        "alimentacao",
        "outros",
      ),
      allowNull: false,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dataHora: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "data_hora",
    },
  },
  {
    tableName: "gastos_roteiro",
    timestamps: false,
    indexes: [
      {
        fields: ["roteiro_id"],
      },
      {
        fields: ["usuario_id"],
      },
      {
        fields: ["data_hora"],
      },
    ],
  },
);

export default GastoRoteiro;
