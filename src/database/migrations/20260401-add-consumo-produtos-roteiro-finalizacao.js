/**
 * Migration: campos de consumo de produtos na finalizacao diaria de roteiro
 * Data: 2026-04-01
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn(
    "roteiro_finalizacao_diaria",
    "estoque_inicial_total",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  );

  await queryInterface.addColumn(
    "roteiro_finalizacao_diaria",
    "estoque_final_total",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  );

  await queryInterface.addColumn(
    "roteiro_finalizacao_diaria",
    "consumo_total_produtos",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  );
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn(
    "roteiro_finalizacao_diaria",
    "consumo_total_produtos",
  );
  await queryInterface.removeColumn(
    "roteiro_finalizacao_diaria",
    "estoque_final_total",
  );
  await queryInterface.removeColumn(
    "roteiro_finalizacao_diaria",
    "estoque_inicial_total",
  );
};
