/**
 * Migration: adiciona veiculoId nos roteiros
 * Data: 2026-03-16
 */

import { DataTypes } from "sequelize";

export const up = async (queryInterface) => {
  await queryInterface.addColumn("Roteiros", "veiculoId", {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: "veiculos",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.addIndex("Roteiros", ["veiculoId"], {
    name: "idx_roteiros_veiculo_id",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex("Roteiros", "idx_roteiros_veiculo_id");
  await queryInterface.removeColumn("Roteiros", "veiculoId");
};
