import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const LogOrdemRoteiro = sequelize.define(
  "LogOrdemRoteiro",
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
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuario_id",
    },
    lojaEsperadaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "loja_esperada_id",
    },
    lojaSelecionadaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_selecionada_id",
    },
    justificativa: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "log_ordem_roteiro",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

export default LogOrdemRoteiro;
