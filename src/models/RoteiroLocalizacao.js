import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroLocalizacao = sequelize.define(
  "RoteiroLocalizacao",
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
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    altitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    heading: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    speed: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "captured_at",
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    encerradaEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "encerrada_em",
    },
  },
  {
    tableName: "roteiro_localizacoes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["roteiro_id", "usuario_id"],
      },
      {
        fields: ["ativa", "updated_at"],
      },
      {
        fields: ["captured_at"],
      },
    ],
  },
);

export default RoteiroLocalizacao;
