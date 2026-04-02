import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const FluxoCaixa = sequelize.define(
  "FluxoCaixa",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movimentacaoId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "movimentacao_id",
      references: {
        model: "movimentacoes",
        key: "id",
      },
      onDelete: "CASCADE",
      comment: "Referência à movimentação que originou a retirada de dinheiro",
    },
    valorEsperado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      field: "valor_esperado",
      comment: "Valor esperado (editável, padrão é o valorFaturado da movimentação)",
    },
    valorRetirado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      field: "valor_retirado",
      comment: "Valor total retirado (legado), soma de físico + digital",
    },
    valorRetiradoFisico: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      field: "valor_retirado_fisico",
      comment: "Valor real retirado em dinheiro físico",
    },
    valorRetiradoDigital: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      field: "valor_retirado_digital",
      comment: "Valor real retirado em dinheiro digital (telemetria)",
    },
    conferencia: {
      type: DataTypes.ENUM("pendente", "bateu", "nao_bateu"),
      allowNull: false,
      defaultValue: "pendente",
      comment: "Se o valor retirado bateu com o esperado",
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Observações sobre a conferência",
    },
    conferidoPor: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "conferido_por",
      references: {
        model: "usuarios",
        key: "id",
      },
      comment: "Usuário que conferiu o valor (admin)",
    },
    dataConferencia: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "data_conferencia",
      comment: "Data/hora em que foi conferido",
    },
  },
  {
    tableName: "fluxo_caixa",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: async (fluxoCaixa) => {
        const fisico =
          fluxoCaixa.valorRetiradoFisico !== null &&
          fluxoCaixa.valorRetiradoFisico !== undefined
            ? Number(fluxoCaixa.valorRetiradoFisico)
            : null;
        const digital =
          fluxoCaixa.valorRetiradoDigital !== null &&
          fluxoCaixa.valorRetiradoDigital !== undefined
            ? Number(fluxoCaixa.valorRetiradoDigital)
            : null;

        if (fisico !== null || digital !== null) {
          fluxoCaixa.valorRetirado = Number(
            ((fisico || 0) + (digital || 0)).toFixed(2),
          );
        }
      },
      beforeUpdate: async (fluxoCaixa) => {
        // Se o valor foi preenchido e ainda não tem data de conferência
        if (fluxoCaixa.valorRetirado !== null && fluxoCaixa.dataConferencia === null) {
          fluxoCaixa.dataConferencia = new Date();
        }
      },
    },
  }
);

export default FluxoCaixa;
