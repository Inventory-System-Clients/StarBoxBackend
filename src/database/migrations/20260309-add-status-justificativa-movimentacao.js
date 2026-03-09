/**
 * Migration: Adiciona status_justificativa na tabela movimentacoes
 * Data: 2026-03-09
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn("movimentacoes", "status_justificativa", {
    type: Sequelize.STRING(20),
    allowNull: true,
    defaultValue: "nova",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn("movimentacoes", "status_justificativa");
};
