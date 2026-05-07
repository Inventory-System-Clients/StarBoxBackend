import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroExecucaoSemanal = sequelize.define(
  "RoteiroExecucaoSemanal",
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
      allowNull: true,
      field: "usuario_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    dataInicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "data_inicio",
    },
    iniciadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "iniciado_em",
    },
    emAndamento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "em_andamento",
    },
    finalizadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "finalizado_em",
    },
  },
  {
    tableName: "roteiro_execucao_semanal",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["roteiro_id"],
      },
      {
        fields: ["em_andamento"],
      },
      {
        fields: ["data_inicio"],
      },
    ],
  },
);

export default RoteiroExecucaoSemanal;
