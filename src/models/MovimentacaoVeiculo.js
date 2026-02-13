import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const MovimentacaoVeiculo = sequelize.define(
  "MovimentacaoVeiculo",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    veiculoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "veiculoid",
      references: { model: "veiculos", key: "id" },
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "usuarioid",
      references: { model: "usuarios", key: "id" },
    },
    tipo: {
      type: DataTypes.ENUM("retirada", "devolucao"),
      allowNull: false,
    },
    dataHora: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "datahora",
    },
    gasolina: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    nivel_limpeza: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    modo: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    km: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    obs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "movimentacoes_veiculos",
    timestamps: false,
  },
);

export default MovimentacaoVeiculo;
