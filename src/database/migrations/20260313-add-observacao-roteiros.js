/**
 * Migration: adiciona campo observacao na tabela de roteiros
 * Data: 2026-03-13
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn("Roteiros", "observacao", {
    type: Sequelize.TEXT,
    allowNull: true,
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn("Roteiros", "observacao");
};
