import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const MovimentacaoStatusDiario = sequelize.define(
  "MovimentacaoStatusDiario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    maquina_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "maquinas",
        key: "id",
      },
    },
    roteiro_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Roteiros",
        key: "id",
      },
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    concluida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["maquina_id", "roteiro_id", "data"],
      },
    ],
    tableName: "movimentacao_status_diario",
    timestamps: false,
  },
);

export default MovimentacaoStatusDiario;
