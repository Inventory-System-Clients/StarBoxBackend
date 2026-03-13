/**
 * Migration: adiciona coluna de quilometragem para gastos de abastecimento
 * Data: 2026-03-13
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn("gastos_roteiro", "quilometragem", {
    type: Sequelize.INTEGER,
    allowNull: true,
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn("gastos_roteiro", "quilometragem");
};
