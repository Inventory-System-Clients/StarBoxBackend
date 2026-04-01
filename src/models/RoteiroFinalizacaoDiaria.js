import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroFinalizacaoDiaria = sequelize.define(
  "RoteiroFinalizacaoDiaria",
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
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    finalizado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    finalizadoPorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "finalizado_por_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    finalizadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "finalizado_em",
    },
    estoqueInicialTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "estoque_inicial_total",
    },
    estoqueFinalTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "estoque_final_total",
    },
    consumoTotalProdutos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "consumo_total_produtos",
    },
  },
  {
    tableName: "roteiro_finalizacao_diaria",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["roteiro_id", "data"],
      },
    ],
  },
);

export default RoteiroFinalizacaoDiaria;
